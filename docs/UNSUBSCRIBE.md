# MailCraft Unsubscribe Architecture & RFC 8058 Compliance

## 1. Regulatory & Standards Compliance

Email regulations worldwide (CAN-SPAM, GDPR, CASL, Indian DPDP Act) and mailbox provider requirements (Google & Yahoo 2024 Bulk Sender Guidelines) mandate:
1. **One-Click Unsubscribe**: Senders of bulk commercial emails must support machine-readable, one-click opt-out without requiring the recipient to log in or enter personal data.
2. **RFC 8058 & RFC 2369 Compliance**: Email headers must contain standardized `List-Unsubscribe` and `List-Unsubscribe-Post` directives.
3. **Immediate Honor of Opt-Outs**: Suppressions must be recorded instantly to prevent further marketing dispatches.

---

## 2. Standardized Email Headers

For every campaign email dispatched by MailCraft, the background worker injects RFC-compliant headers:

```http
List-Unsubscribe: <https://mailcraft.app/api/v1/unsubscribe/{token}>, <mailto:unsubscribe+{token}@mailcraft.app>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### Explanation of Headers
- **`List-Unsubscribe-Post: List-Unsubscribe=One-Click`**: Required by RFC 8058. Informs modern mail clients (Gmail, Apple Mail, Yahoo) that sending an HTTP POST with body `List-Unsubscribe=One-Click` to the target URI will execute the opt-out without further human interaction.
- **`List-Unsubscribe: <https://...>`**: Fallback web link for clients that do not support one-click POST. Clicking this link in a desktop or web browser directs the user to the MailCraft Preference Center.

---

## 3. Unsubscribe Token Architecture

To enable secure, no-login opt-outs without exposing sensitive recipient records:
1. When a campaign recipient record is created, MailCraft generates a unique cryptographic unsubscribe token.
2. The token is derived using a secure random hex generator and stored with the recipient record:
   - `token`: Unique string identifier.
   - `campaignRecipientId`: Pointer to recipient record.
   - `campaignId`: Campaign identifier.
   - `sessionId`: Tenant guest session.
   - `email`: Normalized recipient email.
3. The token is embedded into both the RFC headers and the email footer's "Unsubscribe" hyperlink.

---

## 4. Endpoints & Workflows

### 4.1 RFC 8058 Direct POST
- **Endpoint**: `POST /api/v1/unsubscribe/:token`
- **Body**: `List-Unsubscribe=One-Click` (or JSON payload)
- **Execution**:
  1. Locates recipient record matching `:token`.
  2. Creates or updates entry in `suppressions` collection:
     - `reason`: `'unsubscribe'`
     - `source`: `'rfc_8058_one_click'`
     - `isGlobal`: `true`
  3. Updates `Contact` consent to `'unsubscribed'`.
  4. Records immutable entry in `unsubscribe_events` collection with timestamp and user agent.
  5. Returns HTTP 200 with `{ unsubscribed: true, message: "Successfully unsubscribed" }`.

### 4.2 Web Preference Center
- **Endpoint**: `GET /unsubscribe/:token`
- **UI Experience**:
  - Displays a clean, responsive preference management page.
  - Informs the subscriber which email address is being unsubscribed (masked for privacy).
  - Provides options to:
    - **One-Click Unsubscribe from All MailCraft Campaigns**
    - **Unsubscribe from This Specific Sender Brand Only**
  - Instant visual confirmation upon submission.

---

## 5. Suppression Guarantee & In-Flight Protection

Once an unsubscribe event is processed:
1. **Global Persistence**: The address is added to the global suppression list. Even if a user attempts to re-import the contact via CSV, the system detects the suppressed hash and blocks sending.
2. **In-Flight Pre-Send Recheck**: If a multi-thousand contact campaign is currently processing in background queues, worker threads perform a **just-in-time suppression query immediately prior to socket dispatch**. If the contact unsubscribed 2 seconds ago while earlier batches were sending, the job is transitioned to `skipped` with code `SUPPRESSED_UNSUBSCRIBED`.

