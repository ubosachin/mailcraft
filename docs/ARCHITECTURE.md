# MailCraft System Architecture

## 1. High-Level Overview

MailCraft is a guest-first email marketing platform engineered to allow businesses, startups, creators, and brands to compose high-converting promotional emails and deliver them to permission-based recipient lists without requiring mandatory user registration.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MailCraft Web Client                          │
│               (Next.js 15 App Router · React · Tailwind CSS)           │
│  - Landing Page                 - Step-by-Step Campaign Wizard         │
│  - Guest Workspace              - Email Studio (12+ Predefined Themes) │
│  - Brand Profile & Color Engine - Mobile & Desktop Previews            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MailCraft API Service                           │
│               (Next.js Route Handlers / Node.js runtime)               │
│  - Session Guardian (SHA-256)   - Contact Syntax & Deduplication Engine│
│  - AES-256-GCM Credential Vault - HTML Sanitizer & Templating Bridge   │
│  - Email Verification Engine    - Dispatch Rate Limiting & Ownership   │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌───────────────────┐┌───────────────────┐┌───────────────────┐
     │   MongoDB Atlas   ││  Upstash / Redis  ││ Cloudinary Media  │
     │  9 Core Collections││BullMQ Job Queues ││  Brand Logos &   │
     │ TTL & Unique Idxs ││Campaign Scheduling││  Campaign Images  │
     └───────────────────┘└─────────┬─────────┘└───────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Persistent Background Worker                      │
│                           (Node.js · BullMQ)                           │
│  - Rate-limited Batch Dispatcher                                       │
│  - Adaptive Provider Strategy: Gmail (Low Vol) vs Brevo/SES (Bulk)     │
│  - Automatic Exponential Backoff & Retry with Idempotency              │
│  - Webhook Ingestion & Real-Time Event Sync                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
         ┌───────────────────────┐     ┌───────────────────────┐
         │     Gmail API via     │     │  Bulk Email Provider  │
         │   Google OAuth 2.0    │     │   (Brevo / AWS SES)   │
         │ (Low-volume / Personal│     │ (High-throughput      │
         │  Sender Verification) │     │  Promotional Blasts)  │
         └───────────────────────┘     └───────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Ephemeral Guest Session Model
* **No Account Friction**: Visitors start immediately.
* **Cryptographic Token Hash**: Client receives a high-entropy 256-bit hex token stored in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
* **Database Privacy**: The database stores only the `SHA-256` hash of the session token. Even in the event of a raw database snapshot leak, active session tokens cannot be derived.
* **Optional Email-Based Recovery**: Before any campaign dispatch, sender email ownership is verified via a 6-digit OTP. This verified email binds the session, permitting workspace restoration across browsers.

### 2.2 Dual-Tier Sending Architecture
* **Strict Channel Separation**:
  1. **Gmail OAuth**: Engineered for transactional notifications, personal brand testing, and low-volume communications (<500/day).
  2. **Bulk Provider (Brevo / Amazon SES)**: Dedicated for commercial promotional broadcasts, handling thousands of contacts with DKIM/SPF/DMARC headers, bounce webhooks, and automatic IP reputation controls.
* **Security & Nonce**: Refresh tokens and API keys are encrypted at rest with AES-256-GCM using rotating application master keys and unique initialization vectors (IVs).

### 2.3 Modular Monorepo Organization
* `apps/web`: Next.js 15+ frontend, UI wizard, and route handlers.
* `apps/worker`: Persistent BullMQ worker for batching and provider dispatch.
* `packages/shared-types`: Common TypeScript definitions across frontend, backend, and workers.
* `packages/validation`: Zod schemas enforcing runtime validation at all API boundaries.
* `packages/database`: Mongoose models, connection caching, and encryption helpers.
* `packages/email-renderer`: Server-side React-Email & MJML-safe HTML compiler.
