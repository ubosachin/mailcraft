# MailCraft Analytics & Event Tracking Engine

## 1. Overview

MailCraft provides an end-to-end, privacy-conscious email marketing analytics engine designed for high-accuracy delivery tracking, engagement measurement, and bounce diagnostics.

The core principle of MailCraft analytics is **Absolute Metric Integrity**:
- MailCraft **never** fabricates delivery statistics, synthetic open counts, or simulated engagement.
- Provider acceptance is **never** labeled as confirmed delivery.
- Denominators that equal zero strictly yield `null` (`N/A`) rather than `0%` or `NaN`.

---

## 2. Core Metrics & Mathematical Formulas

| Metric Name | Display Label | Mathematical Formula | Zero Denominator Result | Definition / Provider Behavior |
|:---|:---|:---|:---|:---|
| **Attempted** | Total Attempted | `\sum(\text{Dispatched Messages})` | `0` | Total number of recipient send jobs submitted to background workers. |
| **Provider Accepted** | Provider Accepted | `count(\text{provider\_accepted})` | `0` | Messages successfully acknowledged by the sending provider (Gmail API, Brevo, SES) for relay. |
| **Confirmed Delivered** | Confirmed Delivered | `count(\text{delivered})` | `0` | Messages verified delivered into the recipient's mailbox by webhook confirmation or local mock direct delivery. |
| **Hard Bounces** | Hard Bounces | `count(\text{hard\_bounce})` | `0` | Permanent delivery failures (mailbox does not exist, domain invalid). Triggers automatic global suppression. |
| **Soft Bounces** | Soft Bounces | `count(\text{soft\_bounce})` | `0` | Transient delivery failures (mailbox full, server temporary error). |
| **Complaints** | Spam Complaints | `count(\text{complaint})` | `0` | Recipient marked email as spam via Feedback Loop (FBL). Triggers immediate suppression. |
| **Unique Clickers** | Unique Clickers | `||\{ \text{distinct recipients with clicked events} \}||` | `0` | Number of distinct individuals who clicked at least one link. |
| **Total Clicks** | Total Clicks | `count(\text{clicked})` | `0` | Aggregate number of link touches across all recipients. |
| **Bot Touches** | Security Scanners | `count(\text{clicked where isBot = true})` | `0` | Clicks executed by automated anti-virus, security gateways (e.g., Proofpoint, Defender, Barracuda). |
| **Acceptance Rate** | Acceptance Rate | `(\text{Provider Accepted} / \text{Attempted}) \times 100` | `null` (`N/A`) | Percentage of attempted dispatches accepted by upstream relay. |
| **Delivery Rate** | Confirmed Delivery Rate | `(\text{Confirmed Delivered} / \text{Attempted}) \times 100` | `null` (`N/A`) | Percentage of attempted dispatches confirmed delivered by downstream mailbox. |
| **Bounce Rate** | Total Bounce Rate | `((\text{Hard} + \text{Soft}) / \text{Attempted}) \times 100` | `null` (`N/A`) | Percentage of dispatches that bounced. |
| **Complaint Rate** | Spam Complaint Rate | `(\text{Complaints} / \text{Delivered}) \times 100` | `null` (`N/A`) | Industry threshold: Must remain below **0.10%** (1 per 1,000 deliveries). |
| **Click-Through Rate (CTR)** | Click-Through Rate | `(\text{Unique Clickers} / \text{Delivered}) \times 100` | `null` (`N/A`) | Proportion of delivered audience that engaged with links. |
| **Click-to-Open Rate (CTOR)** | Click-to-Open Rate | `(\text{Unique Clickers} / \text{Unique Opens}) \times 100` | `null` (`N/A`) | Conversion efficiency among subscribers who opened the email. |
| **Unsubscribe Rate** | Unsubscribe Rate | `(\text{Unsubscribes} / \text{Delivered}) \times 100` | `null` (`N/A`) | Proportion of delivered recipients opting out. |

---

## 3. Provider Acceptance vs. Confirmed Delivery

A critical distinction enforced by MailCraft:
- **Provider Acceptance (`provider_accepted`)**: When a message is sent through Amazon SES or Brevo, the provider returns an HTTP 200/202 with a message ID (`Message-ID`). This only indicates that the provider has queued the email for delivery. It **does not guarantee** that the recipient's mail exchange (MX) server accepted or placed the message in the inbox.
- **Confirmed Delivery (`delivered`)**: Occurs only when the downstream receiving mail server accepts the message without a synchronous bounce, as confirmed via a provider delivery webhook (e.g., Amazon SES delivery notification or Brevo `delivered` event).
- If an email sending provider only confirms acceptance and does not supply delivery webhooks (or while webhooks are in transit), MailCraft displays the metric as **"Provider Accepted"** with an explanatory note that downstream mailbox delivery is unconfirmed.

---

## 4. Open Tracking & Apple Mail Privacy Protection (MPP) Limitations

MailCraft supports optional open tracking via a transparent 1x1 tracking pixel embedded before the closing `</body>` tag of outgoing emails.

However, modern email environments impose significant limitations on pixel-based open tracking:
1. **Apple Mail Privacy Protection (MPP)**: iOS 15+, iPadOS 15+, and macOS Monterey+ pre-fetch and cache all remote images through Apple proxy servers as soon as an email arrives in the inbox—even if the subscriber never opens the email. This causes false-positive open events originating from Apple proxy IP ranges with Generic user agents.
2. **Enterprise Image Proxies**: Google Workspace and Yahoo Mail cache remote images via proxy servers (`GoogleImageProxy`), obscuring the recipient's true IP address, geo-location, and repeat opens.
3. **Privacy Blocking**: Privacy-centric email clients (ProtonMail, Hey, Thunderbird with remote content blocked) do not load external images by default, resulting in false-negative open reports.

**MailCraft Policy**: Open rates are presented strictly as **indicative estimates**. Deliverability health and subscriber engagement decisions are prioritized based on **verified link clicks**, **hard bounces**, and **spam complaint rates**.

---

## 5. Click Tracking Architecture & Anti-Open-Redirect Security

MailCraft converts all outbound promotional links into secure tracking redirects during campaign compilation:
1. When generating the campaign HTML in the background worker, each `<a href="...">` is extracted.
2. MailCraft creates a `TrackingToken` record storing:
   - `tokenHash`: Cryptographically random 64-character token.
   - `campaignId`, `campaignRecipientId`, `sessionId`.
   - `destinationUrl`: Strictly validated `http:` or `https:` URL.
3. The link in the email is replaced with:
   `https://mailcraft.app/track/click/[tokenHash]`
4. **Security Safeguards**:
   - The redirect endpoint never reads destination URLs from query parameters (`?url=...`), preventing **Open Redirect Vulnerabilities (CWE-601)**.
   - Destination URLs are looked up strictly from server-side database records.
   - Destination protocol is checked to ensure it begins with `http:` or `https:` (blocking `javascript:`, `data:`, or `file:` URIs).
   - The endpoint issues an `HTTP 302 Found` with `Cache-Control: no-store`.

---

## 6. Bot Detection & Scanner Filtering

Security solutions (Proofpoint, Microsoft Defender SafeLinks, Barracuda) frequently click links inside incoming emails to verify destination safety before delivering to the user's inbox.

MailCraft identifies and filters automated scanner touches:
- User-Agent matching against known bot signatures (`curl`, `wget`, `python`, `bot`, `crawler`, `spider`, `scanner`).
- Detection of headless browsers and cloud hosting IP ranges.
- Clicks recorded with `isBot: true` are tracked separately in the Engagement Dashboard and do not artificially inflate human click metrics or Click-Through Rates.

---

## 7. CSV Export Formula Injection Prevention

When exporting recipient reports or event logs to CSV (`/api/v1/analytics/export`), MailCraft sanitizes all cell values:
- Any text starting with `=, +, -, @, \t, \r, |` is automatically prepended with a single quote (`'`).
- Internal quotes are escaped (`""`) and cells are enclosed in double quotes.
- This mitigates **CSV / Formula Injection (CWE-1236)** in Excel, LibreOffice, and Google Sheets.
