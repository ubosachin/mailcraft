# MailCraft Provider Webhook Architecture & Event Normalization

## 1. Overview

MailCraft ingests real-time asynchronous delivery feedback from email service providers (Brevo, Amazon SES) via public webhook endpoints:
- Brevo: `POST /api/v1/webhooks/brevo` (and legacy alias `/webhooks/brevo`)
- Amazon SES / SNS: `POST /api/v1/webhooks/ses` (and legacy alias `/webhooks/ses`)

All provider-specific payloads are parsed, verified, deduplicated, and normalized into a unified schema stored in the `email_events` collection.

---

## 2. Supported Event Types

| Normalized Event Type | Brevo Event | Amazon SES Event | Lifecycle Impact |
|:---|:---|:---|:---|
| `provider_accepted` | `request` | `Send` | Initial dispatch acknowledgment. |
| `delivered` | `delivered` | `Delivery` | Confirms recipient mail server accepted delivery. |
| `soft_bounce` | `soft_bounce` | `Bounce` (Transient) | Temporary failure. Logged with diagnostic code. |
| `hard_bounce` | `hard_bounce` | `Bounce` (Permanent) | Permanent failure. **Auto-suppresses recipient immediately.** |
| `complaint` | `spam` | `Complaint` | Feedback Loop spam mark. **Auto-suppresses recipient immediately.** |
| `opened` | `opened` | `Open` | Mailbox opened or proxy pre-fetch. |
| `clicked` | `click` | `Click` | Recipient clicked link. |
| `unsubscribed` | `unsubscribed` | `Subscription` | Recipient opted out via provider link. |
| `rejected` | `blocked` / `invalid_email` | `Reject` | Provider refused to dispatch. |

---

## 3. Deduplication Strategy

Webhooks in distributed email systems are subject to **at-least-once delivery semantics**. The same event may be retried multiple times during network hiccups.

MailCraft implements a multi-layer deduplication guarantee:
1. **Compound Unique Index**:
   ```typescript
   EmailEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
   ```
2. **Deterministic Event IDs**:
   - For Brevo: `brevo_${payload.id || payload['message-id']}_${payload.event}`
   - For Amazon SES: `ses_${messageId}_${notificationType}`
3. **Database Insertion Defense**:
   If an incoming webhook attempts to insert a duplicate event ID for the same provider, the MongoDB unique constraint triggers `E11000 duplicate key error`. The webhook processor catches this gracefully, marks the webhook log as `ignored (duplicate)`, and returns HTTP 200 without corrupting campaign aggregates.

---

## 4. Terminal State Protection

Email recipient records follow a strict state progression:
`queued` &rarr; `sending` &rarr; `sent` &rarr; `delivered` &rarr; (`opened` / `clicked`) &rarr; [`bounced`, `failed`, `complaint`, `unsubscribed`]

A transient network delay must never allow an out-of-order `delivered` or `sent` event to overwrite a terminal `bounced` or `unsubscribed` state.

**Enforcement Rule**:
When updating `CampaignRecipient` status:
- If current status is `bounced`, `complaint`, `unsubscribed`, or `failed`, the status is **terminal** and cannot be downgraded to `delivered` or `sent`.
- Campaign aggregates maintain monotonic invariants: bounce and complaint counters are never decremented by subsequent delayed events.

---

## 5. Amazon SES SNS Webhook Integration

Amazon SES publishes delivery notifications through AWS Simple Notification Service (SNS).

### Subscription Confirmation Handshake
When an SNS HTTP/HTTPS subscription is created or renewed, AWS sends a `SubscriptionConfirmation` POST request:
```json
{
  "Type": "SubscriptionConfirmation",
  "MessageId": "165545c6-65c4-4324-8562-519276d4dd71",
  "Token": "23624523f14272354234523454352345...",
  "TopicArn": "arn:aws:sns:us-east-1:123456789012:mailcraft-ses-events",
  "SubscribeURL": "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=..."
}
```
MailCraft automatically confirms the subscription:
1. Parses the payload detecting `Type === "SubscriptionConfirmation"`.
2. Validates that `SubscribeURL` is a valid AWS domain (`*.amazonaws.com`).
3. Sends an HTTP GET request to `SubscribeURL` to complete the AWS handshake.
4. Returns HTTP 200 with `{ confirmed: true }`.

### Notification Processing
When a notification arrives (`Type === "Notification"`), MailCraft parses the inner JSON `Message` string containing the SES event detail, extracts the recipient email, identifies the matching campaign via `campaignRecipientId` or `providerMessageId`, updates recipient records, and records the `EmailEvent`.

---

## 6. Automatic Suppression Engine

When any webhook reports a **hard bounce** or **spam complaint**:
1. The recipient's email is normalized and SHA-256 hashed.
2. An entry is created or updated in the `suppressions` collection:
   - `reason`: `'hard_bounce'` or `'complaint'`
   - `isGlobal`: `true`
   - `metadata`: includes bounce diagnostic code or feedback loop provider.
3. The contact's `consentStatus` in the `contacts` collection is immediately updated to `'suppressed'`.
4. Any in-flight or future campaign targeting this address will be automatically blocked by the **Pre-Send Recheck Gate**.

