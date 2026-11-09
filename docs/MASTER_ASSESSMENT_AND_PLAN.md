# MailCraft Master Repository Assessment & Architecture Plan

## 1. Current Repository Assessment

### 1.1 Existing Strengths
- **Modular Monorepo**: Set up with `pnpm` workspaces (`apps/web`, `apps/worker`, `packages/shared-types`, `packages/validation`, `packages/database`, `packages/email-renderer`, `packages/email-providers`).
- **Database & Security Layer**:
  - MongoDB Mongoose models configured for 9 collections with compound unique indexes and TTL indexes.
  - AES-256-GCM authenticated credential vault (`encryptCredentials` / `decryptCredentials`) for securing OAuth tokens and provider API keys.
  - HMAC-SHA256 session token hashing; high-entropy 256-bit tokens delivered in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
  - 6-digit OTP anti-spoofing sender email verification.
- **Email Renderer**:
  - 12 production templates with distinct designs and structured JSON schemas.
  - Bulletproof email HTML compiler with table structures, inline CSS, mobile media queries, and plain-text fallback.
- **Providers & Workers**:
  - `IEmailProvider` abstraction implemented with `GmailProvider`, `BrevoProvider`, and `MockProvider`.
  - BullMQ campaign processor and test email processor in `apps/worker`.
- **APIs**:
  - Complete REST API routes under `/api/v1` for guest sessions, brands, templates, contacts, connections, campaigns, and unsubscribes.

### 1.2 Areas Requiring Expansion
- **Public Marketing Pages**: Needs `/templates` (interactive gallery with search and category filter), `/pricing` (clear breakdown of guest model and provider tiers), `/privacy`, `/terms`, and `/contact`.
- **Interactive Workspace Upgrades**:
  - Recipient Hub: Full CSV/XLSX file drag-and-drop parser, real-time validation stats, and contact list management.
  - Sending Connections: Live modals for connecting Gmail OAuth and Brevo API keys with encrypted storage and connection testing.
  - Campaign Launch Checklist: Pre-flight validation gate ensuring brand verification, connected provider, and recipient consent before queuing BullMQ jobs.
  - Live Analytics Dashboard: Real-time progress tracking of campaign dispatch, delivery rates, bounce logs, and audit timeline.
- **Provider Webhooks & File Uploads**:
  - `/api/v1/brands/logo`: Multi-part logo upload handler.
  - `/api/v1/webhooks/brevo`: Ingestion for bounce, delivery, and click events.
  - `/api/v1/webhooks/ses`: SES event ingestion.

---

## 2. Dependency List & Versions

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `next` | `15.5.29` | React framework with App Router & server routes |
| `react` / `react-dom` | `19.0.0` | UI rendering engine |
| `tailwindcss` | `3.4.17` | Responsive styling |
| `mongoose` | `8.24.8` | MongoDB ODM with connection pooling |
| `bullmq` | `5.41.0` | High-throughput distributed Redis queue |
| `ioredis` | `5.6.0` | Redis client for BullMQ |
| `zod` | `3.24.2` | Runtime validation for API payloads |
| `lucide-react` | `0.475.0` | UI iconography |
| `csv-parse` / `xlsx` | Latest | CSV & Excel recipient parsing |

---

## 3. Database Models Plan

All 11 collections are designed and integrated:
1. `guest_sessions`: Token hash, 7-day TTL index, verified email, OTP hash.
2. `brands`: Brand identity, logo URL, colors, business address, social links.
3. `email_connections`: Encrypted credentials (AES-256-GCM), provider type, verification timestamp.
4. `contacts`: Deduplicated recipient list, consent source, opt-in timestamp.
5. `templates`: 12 production templates with JSON schemas.
6. `campaigns`: Campaign status, editor data, rendered HTML, real-time metrics.
7. `campaign_recipients`: Per-recipient delivery log, provider message ID, error codes.
8. `campaign_events`: Event stream (sent, delivered, opened, clicked, bounced, unsubscribed).
9. `suppressions`: Global & session-level suppression registry with SHA-256 email hashes.
10. `unsubscribe_tokens`: Signed opaque tokens for one-click compliance.
11. `audit_logs`: Administrative and security event audit trail.

---

## 4. API Implementation Plan

All endpoints prefixed with `/api/v1`:
- `/guest/*`: start, verify-email, verify-email/confirm, me, refresh, session.
- `/brands/*`: POST, GET, PATCH, /current, /logo.
- `/connections/*`: providers, provider, GET, :id/test, :id (DELETE).
- `/contacts/*`: POST, GET, /bulk, /upload, /validate, :id (DELETE).
- `/templates/*`: GET, :id, :id/preview.
- `/campaigns/*`: POST, GET, :id, PATCH, render, test, send, pause, resume, cancel, analytics.
- `/unsubscribe/:token`: POST (public unsubscribe execution).
- `/webhooks/*`: brevo, ses.

---

## 5. Security & Anti-Abuse Checklist

- [x] High-entropy 256-bit session tokens stored only as SHA-256 hashes in MongoDB.
- [x] Session tokens delivered in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- [x] AES-256-GCM authenticated credential encryption for stored provider keys.
- [x] Mandatory 6-digit OTP verification of sender email ownership.
- [x] Session ownership verification on every protected resource.
- [x] One-click `List-Unsubscribe` headers and global suppression table.
- [x] Prevention of purchased/scraped contact lists through mandatory opt-in gating.
- [x] Idempotent webhook event processing.

