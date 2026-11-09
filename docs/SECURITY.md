# MailCraft Security & Anti-Abuse Architecture

**Document Version:** 2.0.0  
**Updated:** November 2026

A guest-first email marketing platform requires multi-layered defense-in-depth protections to prevent credential exposure, spam abuse, open relay exploits, and denial-of-service.

---

## 1. Cryptographic Security Standards

### 1.1 Guest Session Tokens
* **Entropy**: Generated using `crypto.randomBytes(32)` yielding 64-character hexadecimal tokens (256-bit entropy).
* **Storage Protection**: Only the **SHA-256 hash** of the token is written to MongoDB:
  $$\text{hash} = \text{HMAC-SHA256}(\text{token}, \text{APP\_SECRET})$$
* **Cookie Attributes**:
  - `HttpOnly`: Inaccessible to client JavaScript, mitigating XSS token harvesting.
  - `Secure`: Transmitted solely over HTTPS in production.
  - `SameSite=Lax`: Mitigates Cross-Site Request Forgery (CSRF).
  - 7-day sliding window TTL refreshed on active requests.

### 1.2 Credential Encryption Vault (AES-256-GCM)
* Third-party provider secrets (Gmail OAuth tokens, Brevo API keys, Amazon SES credentials) are encrypted at rest using authenticated symmetric encryption:
  - **Cipher**: `aes-256-gcm`
  - **Key**: 32-byte master encryption key (`ENCRYPTION_KEY`, 64 hex chars)
  - **IV**: Unique 12-byte initialization vector per record
  - **Auth Tag**: 16-byte authentication tag ensuring integrity and non-tampering
  - **Versioning**: Document-level `credentialVersion` supporting seamless key rotation.

---

## 2. Anti-Spam & Reputation Protection

### 2.1 Compulsory Sender Email Verification
* Before a campaign can be submitted to the queue, the guest must verify ownership of `senderEmail` via a 6-digit one-time passcode (OTP).
* Disposable and burner email domains (e.g. `mailinator.com`, `guerrillamail.com`, `tempmail.com`) are strictly rejected.

### 2.2 Global & Session-Level Suppressions
* Unsubscribe requests immediately generate a `suppression` record indexed by `emailHash`.
* Background workers execute an **in-flight suppression check** immediately prior to socket transmission.
* **Legal Invariance**: Global suppressions survive guest session expiration and cleanup routines.
* **Audit Requirement**: Any administrative removal of a suppression entry requires a documented justification audit log.

### 2.3 Strict Rate Limiting & Tiered Sending
* **Gmail**: Quota-restricted personal sending (< 500/day).
* **Brevo & SES**: Bulk sending backed by BullMQ queue pacing (20ms) to prevent provider rate-limit rejections.

---

## 3. OWASP Top 10 & Application Security Mitigations

### 3.1 Cross-Site Scripting (XSS)
- React Email and Next.js automatic HTML escaping.
- Strict `Content-Security-Policy` header in `apps/web/middleware.ts` restricting script execution to `'self'` and `'unsafe-inline'` / `'unsafe-eval'` for Next.js hydration.
- User input interpolated into email templates via sanitized regex replacement.

### 3.2 Insecure Direct Object References (IDOR) & Multi-Tenant Isolation
- Every protected API route enforces strict guest session ownership:
  `{ _id: resourceId, sessionId: session._id }`
- Cross-session access returns HTTP 404 Not Found to prevent resource enumeration.

### 3.3 Server-Side Request Forgery (SSRF) & Safe Tracking Redirects
- Outbound click tracking (`GET /track/click/:token`) uses strictly server-side database lookups for destination URLs. Client-supplied URL query parameters are rejected.
- URL schemes are validated to ensure only `http:` and `https:` targets are redirected.

### 3.4 Open Relays & Test Email Abuse Prevention
- Test email sending endpoint (`POST /api/v1/campaigns/:id/test`) is rate-limited to 15 dispatches per 15 minutes per session.
- Campaign validation enforces that subject lines, preheaders, and sender identities match verified brand profiles.

---

## 4. File Upload & Spreadsheet Security

### 4.1 Cloudinary & Media Uploads
- File MIME types restricted to: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`.
- Hard size limit enforced: maximum 5 MB per file.
- Direct Cloudinary upload uses server-side signed HMAC-SHA1 payloads with short-lived timestamps.

### 4.2 CSV & Spreadsheet Formula Injection (CSV DDE)
- Export fields are processed through `sanitizeFormulaInjection()`: any field beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single quote (`'`).
- `parseXlsxBuffer()` reads spreadsheets with `cellFormula: false` and `cellHTML: false`, preventing arbitrary macro or script execution.

---

## 5. Rate Limiting & Abuse Prevention Controls

| Action | Limit Window | Scope | Threshold |
|---|---|---|---|
| **Session Initialization** | 10 minutes | Client IP | 10 sessions |
| **Campaign Creation** | 1 hour | Session ID | 20 campaigns |
| **Campaign Broadcast** | 1 hour | Session ID | 5 live dispatches |
| **Test Email Sending** | 15 minutes | Session ID | 15 test emails |
| **Contact Imports** | 1 hour | Session ID | 10 imports |
| **Webhooks** | 1 second | Provider IP | 30 events |
| **General API** | 1 minute | Session ID / IP | 120 requests |

Exceeding limits returns HTTP `429 Too Many Requests` with a `Retry-After` header.

---

## 6. Logging Hygiene & Credential Scrubbing

MailCraft uses a structured JSON logger (`apps/web/lib/logger.ts` and `apps/worker/src/logger.ts`) that automatically redacts sensitive data:
- Keys matching `token`, `secret`, `key`, `password`, `authorization`, `iv`, `tag`, and `cookie` are replaced with `[REDACTED]`.
- Email addresses are masked in logs (e.g. `al***@example.com`).
- Stack traces are omitted in production log streams.
