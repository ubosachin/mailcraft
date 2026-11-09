# MailCraft Production Pre-Launch Checklist

**Platform:** MailCraft — No-Login Promotional Email Marketing SaaS  
**Version:** 1.0.0  
**Verification Date:** November 2026

---

## 1. Security & Authentication Gate

- [x] High-entropy 256-bit guest session tokens generated via `crypto.randomBytes(32)`.
- [x] Zero raw session tokens in database; only HMAC-SHA256 hashes persisted.
- [x] Cookies set with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes with 7-day sliding TTL.
- [x] Third-party provider credentials encrypted at rest with **AES-256-GCM** using unique IVs and auth tags.
- [x] Compulsory sender ownership verification via 6-digit OTP before campaigns can be launched.
- [x] Disposable / burner email domains rejected on sender verification.
- [x] Rate limiting active on session creation, campaign creation, live sends, and test email relays.
- [x] HTTP security headers active (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`).
- [x] Outbound click tracking validates URL protocols and prevents open redirects.
- [x] Spreadsheet formula injection sanitized on all exports (`=`, `+`, `-`, `@` prepended with `'`).
- [x] Structured JSON logger automatically scrubs keys matching `token`, `secret`, `password`, `key`, `iv`.

---

## 2. Deliverability & Regulatory Compliance Gate

- [x] Mandatory physical business postal address required in brand profile.
- [x] RFC 8058 (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`) and RFC 2369 headers injected into all outgoing emails.
- [x] Public one-click unsubscribe endpoint operational at `/unsubscribe/:token` and `/api/v1/unsubscribe/:token`.
- [x] In-flight pre-send worker suppression check immediately prior to provider socket dispatch.
- [x] Global suppression list preserved across guest session expiration and cleanup routines.
- [x] Removal of suppression entries strictly requires documented administrative audit justification.
- [x] Live authoritative DNS check verifying SPF (`v=spf1`) and DMARC (`v=DMARC1`) records.
- [x] 10-rule automated compliance validator enforcing CAN-SPAM, GDPR, and Indian DPDP / TRAI mandates.

---

## 3. Email Infrastructure & Sending Channels

- [x] Personal channel: Google OAuth 2.0 PKCE flow with state CSRF binding and token refresh.
- [x] Bulk channel: Brevo REST API v3 transactional and promotional dispatch with live DNS inspection.
- [x] Bulk channel: Amazon SES pure-TypeScript SigV4 signer with zero SDK bloat.
- [x] Multi-tenant isolation verified; cross-session credential queries return HTTP 404.
- [x] Verified webhooks for Brevo and Amazon SES SNS with deduplication compound unique index `{ provider: 1, eventId: 1 }`.
- [x] Terminal state preservation: late-arriving delivery events never downgrade bounces or unsubscribes.

---

## 4. Templates, Editor & Rendering

- [x] 12 production-grade promotional email templates with responsive table layouts and MSO conditionals.
- [x] Server-side HTML and plain-text compilation with dynamic token interpolation.
- [x] 3-panel drag-and-drop visual email editor with live preview, mobile viewport switcher, and instant test email dispatch.

---

## 5. Recipient Ingestion & Dynamic Audiences

- [x] Triple input channels: single entry, multi-line bulk paste, and CSV/XLSX file upload.
- [x] XLSX reading configured with `cellFormula: false` and `cellHTML: false` to neutralize macro payloads.
- [x] Case-insensitive deduplication within session (`{ sessionId: 1, normalizedEmail: 1 }`).
- [x] Dynamic audience segment builder with live filter queries.

---

## 6. Background Queue & Worker Resilience

- [x] Persistent Node.js BullMQ worker architecture running `mailcraft-campaigns` and `mailcraft-test-emails`.
- [x] Stalled recipient recovery: worker resets stalled `'processing'` recipients to `'queued'` at job boot.
- [x] Provider timeout safety: uncertain network timeouts marked as `TIMEOUT_UNCERTAIN` to prevent duplicate dispatches.
- [x] Dead-Letter Queue (`mailcraft-campaigns-dlq`) for jobs exceeding retry attempts.
- [x] 20ms recipient pacing delay to prevent provider throttling.
- [x] Graceful shutdown on `SIGINT` and `SIGTERM`.

---

## 7. Monitoring, Health & Environment

- [x] Standard probes operational: `/health`, `/health/ready`, `/health/live`.
- [x] Queue depth and system resource metrics exposed at `/api/v1/health/metrics`.
- [x] Environment variables validated at startup in both web and worker via Zod schemas.
- [x] Production example templates created: `.env.example`, `.env.development.example`, `.env.production.example`.
- [x] CI/CD pipeline configured via `.github/workflows/ci.yml`.
- [x] Non-interactive ESLint configuration (`apps/web/.eslintrc.json`).
- [x] All 9 test suites passing with 100% assertions (`pnpm test`).

