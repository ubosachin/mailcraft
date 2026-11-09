# MailCraft Production Readiness & Security Audit

**Document Version:** 1.0.0  
**Audit Date:** November 2026  
**Audited Platform:** MailCraft — Guest-First Promotional Email Marketing SaaS  
**Target Environment:** Production Deployment (Vercel Frontend, Persistent Node.js Worker, MongoDB Atlas, Upstash/Redis, Cloudinary)

---

## 1. Executive Summary

A comprehensive architectural, security, performance, and code audit was conducted on the MailCraft repository covering all seven previously completed development phases:
1. Foundation & Guest Authentication
2. Template Library & Email Rendering
3. Drag-and-Drop Visual Editor
4. Multi-Provider Infrastructure (Gmail OAuth, Brevo v3, Amazon SES SigV4, Mock)
5. Recipient Management & Spreadsheet Import Engine
6. Campaign Lifecycle & Bulk Dispatch Worker
7. Analytics, Tracking & Compliance Engine

The audit confirmed that core functionality is implemented with high architectural standards:
- **Zero raw tokens in the database**: Sessions are hashed using HMAC-SHA256, with high-entropy 256-bit tokens delivered via secure `HttpOnly`, `SameSite=Lax` cookies.
- **Cryptographic Credential Vault**: Third-party credentials (OAuth tokens, Brevo API keys, AWS credentials) are encrypted at rest with **AES-256-GCM** using unique 12-byte IVs and 16-byte authentication tags.
- **Multi-channel sending separation**: Quota-restricted personal sending (Gmail API) is isolated from high-volume bulk dispatch (Brevo & SES).
- **Anti-spam & Compliance**: Real-time pre-send suppression checks, RFC 8058 one-click unsubscribe headers, physical address enforcement, and authoritative DNS checks.

This audit identified **9 key areas** requiring production hardening before public deployment, categorized by severity below.

---

## 2. Audit Findings by Severity

| ID | Category | Severity | Affected Component | Status |
|---|---|---|---|---|
| **AUD-01** | Abuse Prevention | **Critical** | Guest Session Creation & Campaign Dispatch | Resolved in Phase 8 |
| **AUD-02** | Infrastructure | **High** | Health & Readiness Probes (`/health/ready`, `/health/live`) | Resolved in Phase 8 |
| **AUD-03** | Security | **High** | HTTP Security Headers & Unified CORS Preflight | Resolved in Phase 8 |
| **AUD-04** | Configuration | **High** | Environment Variable Validation at Startup | Resolved in Phase 8 |
| **AUD-05** | Reliability | **High** | Worker Stalled Recipient Recovery & DLQ Routing | Resolved in Phase 8 |
| **AUD-06** | Data Governance | **Medium** | Cascading Cleanup & Global Suppression Retention | Resolved in Phase 8 |
| **AUD-07** | Observability | **Medium** | Structured JSON Logging & Sentry Exception Hooks | Resolved in Phase 8 |
| **AUD-08** | Database | **Medium** | MongoDB TTL Indexes on Tracking Tokens & Webhook Logs | Resolved in Phase 8 |
| **AUD-09** | CI/CD | **Low** | Automated GitHub Actions Pipeline & ESLint Config | Resolved in Phase 8 |

---

## 3. Detailed Audit Findings & Technical Remediation

### AUD-01: Guest Session Abuse & Resource Flooding Protection
* **Severity:** **Critical**
* **Affected Component:** `apps/web/lib/rate-limiter.ts`, `apps/web/app/api/v1/guest/session`, `apps/web/app/api/v1/campaigns/[id]/send`
* **Technical Explanation:**
  MailCraft eliminates traditional user registration in favor of ephemeral guest workspaces. Without strict rate limiting and quota enforcement, malicious clients or automated bots can:
  1. Flood `POST /api/v1/guest/session` to generate millions of sessions in MongoDB.
  2. Abuse test email dispatches (`POST /api/v1/campaigns/:id/test`) as open email relays.
  3. Exhaust third-party provider quotas (Gmail, Brevo, SES) with unauthorized broadcasts.
* **Recommended Fix:**
  Implement a layered sliding-window rate limiting engine with Redis storage (and memory fallback):
  - IP-based rate limiting on session creation: max 10 sessions per IP per 10 minutes.
  - Session-based campaign creation limits: max 20 campaigns per session per hour.
  - Session-based dispatch limits: max 5 active broadcasts per session per hour.
  - Test email relay limits: max 15 test emails per session per 15 minutes.
  - Disposable email domain blocking: reject known burner email domains on sender OTP verification.
* **Verification Method:**
  Automated tests verifying that exceeding thresholds yields `429 Too Many Requests` with `Retry-After` headers.

---

### AUD-02: Missing Health & Readiness Probes for Production Orchestrators
* **Severity:** **High**
* **Affected Component:** `apps/web/app/health`, `apps/web/app/health/ready`, `apps/web/app/health/live`
* **Technical Explanation:**
  Cloud hosting platforms and container orchestrators (Kubernetes, AWS ECS, Railway, Render, Vercel) require separate probes:
  - **Liveness probe (`/health/live`)**: Confirms the Node.js event loop is operational and memory usage is healthy.
  - **Readiness probe (`/health/ready`)**: Verifies active connectivity to upstream dependencies (MongoDB ping, Redis ping, queue state) before routing live user traffic.
  Previously, only a simple database check existed at `/api/v1/health`.
* **Recommended Fix:**
  Create standard `/health`, `/health/ready`, and `/health/live` endpoints (along with `/api/v1/health/*` mirrors). `/health/ready` returns 200 only when MongoDB and Redis ping commands succeed with latency metrics, or 503 Service Unavailable if any upstream fails.
* **Verification Method:**
  Test `/health/ready` and `/health/live` via HTTP, asserting response code 200 with dependency statuses and latency numbers.

---

### AUD-03: HTTP Security Headers, Content-Security-Policy & CORS
* **Severity:** **High**
* **Affected Component:** `apps/web/next.config.ts`, `apps/web/middleware.ts`
* **Technical Explanation:**
  Without strict HTTP security headers, web applications remain vulnerable to clickjacking, MIME-type sniffing, cross-site scripting (XSS), and unauthorized framing of the email visual editor.
* **Recommended Fix:**
  Deploy Next.js edge middleware injecting:
  - `Content-Security-Policy`: Restricting script execution to self, allowing necessary Google Fonts and Cloudinary images, and preventing external frame embedding (`frame-ancestors 'self'`).
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - Unified CORS middleware handling `OPTIONS` preflight requests on `/api/v1/*` routes.
* **Verification Method:**
  Inspect response headers on page and API endpoints using automated test assertions.

---

### AUD-04: Environment Variable Validation at Startup
* **Severity:** **High**
* **Affected Component:** `packages/validation/src/env.schema.ts`, `apps/web/lib/env.ts`, `apps/worker/src/index.ts`
* **Technical Explanation:**
  Misconfigured production environment variables (such as an invalid 64-character hex `ENCRYPTION_KEY`, missing `MONGODB_URI`, or malformed `REDIS_URL`) would cause runtime crashes during active campaign sending rather than failing immediately at deployment time.
* **Recommended Fix:**
  Implement strict Zod validation schemas for server environment variables. Run validation during web server and worker startup, logging a redacted summary of active vs unconfigured features while masking all secrets.
* **Verification Method:**
  Execute startup checks with valid and malformed keys, ensuring clear error diagnostics.

---

### AUD-05: Worker Stalled-Job Recovery & Dead-Letter Queue (DLQ)
* **Severity:** **High**
* **Affected Component:** `apps/worker/src/processors/campaign.processor.ts`, `apps/web/lib/queue.ts`
* **Technical Explanation:**
  If a worker container crashes or restarts while processing a chunk of recipients, those recipients remain in status `'processing'`. Subsequent batch queries (`status: { $in: ['pending', 'queued'] }`) will skip them, causing campaigns to stall permanently. Furthermore, jobs that exceed retry limits must not be silently discarded.
* **Recommended Fix:**
  1. Add automatic stalled recipient recovery at campaign job start:
     `await CampaignRecipient.updateMany({ campaignId, status: 'processing' }, { $set: { status: 'queued' } });`
  2. Implement BullMQ Dead-Letter Queue (`mailcraft-campaigns-dlq`) for jobs exceeding maximum retry attempts.
  3. Configure job lock durations and stalled intervals (`lockDuration: 30000`, `stalledInterval: 15000`).
* **Verification Method:**
  Integration test verifying that recipients in `'processing'` status are recovered and successfully delivered upon worker restart.

---

### AUD-06: Cascading Data Retention & Global Suppression Protection
* **Severity:** **Medium**
* **Affected Component:** `packages/database/src/cleanup.ts`, `packages/database/src/models/Suppression.ts`
* **Technical Explanation:**
  MongoDB TTL indexes delete expired `guest_sessions` documents after 7 days, but related contacts, campaigns, campaign recipients, and uploads are left orphaned. Crucially, legally required suppression records (`Suppression` collection) must NEVER be deleted during guest session cleanup to prevent re-messaging unsubscribed users.
* **Recommended Fix:**
  Implement `cleanupExpiredGuestData()`:
  - Scans for expired or revoked guest sessions older than TTL.
  - Cascades deletion to orphaned brands, contacts, imports, campaign drafts, and tracking tokens.
  - **Explicitly preserves** all `Suppression` records where `scope: 'global'`.
* **Verification Method:**
  Run cleanup test and assert that session data is pruned while suppression records remain intact.

---

### AUD-07: Structured JSON Logging & Sentry Exception Hooks
* **Severity:** **Medium**
* **Affected Component:** `apps/web/lib/logger.ts`, `apps/worker/src/logger.ts`
* **Technical Explanation:**
  Using unformatted `console.log` in production leads to messy log streams and risks accidentally logging sensitive secrets, encryption keys, auth tokens, or personally identifiable recipient emails.
* **Recommended Fix:**
  Implement a structured JSON logger featuring:
  - Fields: `timestamp`, `service`, `level`, `environment`, `requestId`, `sessionId`, `campaignId`, `message`.
  - Automatic recursive redaction of sensitive keys (`token`, `secret`, `password`, `key`, `authorization`, `iv`, `tag`).
  - Recipient email address masking (e.g. `al***@example.com`).
  - Sentry exception capture hooks when `SENTRY_DSN` is configured.
* **Verification Method:**
  Test logger with mock credential objects, confirming secrets are replaced with `[REDACTED]`.

---

### AUD-08: MongoDB TTL Indexes on Tracking Tokens & Webhook Event Logs
* **Severity:** **Medium**
* **Affected Component:** `packages/database/src/models/TrackingToken.ts`, `packages/database/src/models/WebhookEventLog.ts`
* **Technical Explanation:**
  `TrackingToken` had an indexed `expiresAt` field but lacked the MongoDB `{ expires: 0 }` TTL modifier. `WebhookEventLog` lacked any expiration index. In high-volume production use, these collections would grow unbounded.
* **Recommended Fix:**
  Add `{ expires: 0 }` TTL index to `TrackingToken.expiresAt` and `{ expires: 30 * 24 * 3600 }` (30 days) to `WebhookEventLog.receivedAt`.
* **Verification Method:**
  Verify schema index specifications in Mongoose models.

---

### AUD-09: Automated GitHub Actions CI/CD & Non-Interactive ESLint
* **Severity:** **Low**
* **Affected Component:** `.github/workflows/ci.yml`, `apps/web/.eslintrc.json`
* **Technical Explanation:**
  The repository lacked a GitHub Actions workflow and `.eslintrc.json`, causing `next lint` to prompt interactively for setup.
* **Recommended Fix:**
  Create `apps/web/.eslintrc.json` extending `next/core-web-vitals` and implement `.github/workflows/ci.yml` running lint, typecheck, tests, and builds on pull requests.
* **Verification Method:**
  Execute lint and build scripts locally without interactive prompts.

---

## 4. Audit Conclusion & Readiness Status

With the remediation of findings AUD-01 through AUD-09 implemented in Phase 8, MailCraft satisfies all architectural, security, reliability, and deliverability prerequisites for production deployment.

