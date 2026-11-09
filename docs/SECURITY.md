# MailCraft Security & Anti-Abuse Architecture

A guest-accessible platform requires defense-in-depth protections to prevent credential exposure, spam abuse, and serverless denial-of-service.

---

## 1. Cryptographic Security Standards

### 1.1 Guest Session Tokens
* **Entropy**: Generated using `crypto.randomBytes(32)` yielding 64-character hexadecimal tokens (256-bit entropy).
* **Storage Protection**: Only the **SHA-256 hash** of the token is written to MongoDB:
  $$\text{hash} = \text{HMAC-SHA256}(\text{token}, \text{APP\_SECRET})$$
* **Cookie Attributes**:
  - `HttpOnly`: Inaccessible to browser JavaScript, mitigating XSS token harvesting.
  - `Secure`: Transmitted solely over HTTPS in production.
  - `SameSite=Lax`: Mitigates Cross-Site Request Forgery (CSRF).
  - Expiry set to 7 days from last activity.

### 1.2 Credential Encryption (AES-256-GCM)
* Gmail OAuth refresh tokens, Brevo API keys, and Amazon SES credentials are encrypted using authenticated symmetric encryption:
  - **Cipher**: `aes-256-gcm`
  - **Key**: 32-byte master encryption key derived from `ENCRYPTION_KEY`
  - **IV**: Fresh 12-byte initialization vector generated per encryption operation
  - **Auth Tag**: 16-byte authentication tag ensuring integrity and non-tampering
* At rest format:
  ```json
  {
    "iv": "6f2e8...",
    "tag": "a1c4b...",
    "data": "e710d..."
  }
  ```

---

## 2. Anti-Spam & Reputation Protection

### 2.1 Compulsory Sender Email Verification
* Before a campaign can be submitted to the queue, the guest must verify ownership of `senderEmail` via a 6-digit one-time passcode (OTP).
* Prevents bad actors from spoofing arbitrary domains or masquerading as reputable organizations.

### 2.2 Global & Session-Level Suppressions
* Unsubscribe requests immediately generate a `suppressions` record indexed by `emailHash`.
* The worker filters all recipient batches against the suppression table prior to dispatching any HTTP or SMTP call to providers.
* Global suppressions survive guest session expiration to prevent harassment of unsubscribed recipients across sessions.

### 2.3 Strict Rate Limiting & Tiered Sending
* **Gmail**: Restricted to verified personal outreach and small batches (< 50 recipients).
* **Brevo / SES**: Requires valid sender domain and rate-limited to avoid provider throttling (e.g., 10-20 ms pacing per message).

---

## 3. Regulatory Compliance (CAN-SPAM, GDPR, DPDP)

1. **Physical Address / Sender Identification**: Mandated in Brand footer configuration.
2. **One-Click Unsubscribe**: Headers included in every outgoing message:
   ```http
   List-Unsubscribe: <https://mailcraft.dev/api/v1/unsubscribe/{token}>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```
3. **Transparent Opt-In Affirmation**: Guests must explicitly check the confirmation box certifying that all uploaded recipients gave unambiguous consent.

