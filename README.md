# MailCraft 🚀

> **No-login promotional email creation and delivery platform**

MailCraft allows businesses, startups, creators, and small brands to design professional marketing emails and send them to their own permission-based recipient lists — **without mandatory account registration**.

---

## 🌟 Key Architecture & Principles

- **Guest-First Architecture**: High-entropy 256-bit cryptographically secure session tokens stored in `HttpOnly`, `SameSite=Lax` cookies; MongoDB stores solely `SHA-256` token hashes with a 7-day TTL.
- **Dual Sending Channels**:
  - **Google OAuth (Gmail API)**: Low-volume, personal sender delivery (< 500/day).
  - **Brevo & Amazon SES**: High-throughput promotional blast delivery backed by Redis & BullMQ workers.
- **Security & Anti-Abuse**:
  - AES-256-GCM authenticated encryption for provider tokens and API keys.
  - Mandatory sender email OTP ownership verification before campaign dispatch.
  - Global suppression list and RFC 8058 / RFC 2369 one-click `List-Unsubscribe` headers.
  - Duplicate email detection and RFC 5322 syntax validation.
- **12 Production Email Templates**: Bulletproof HTML/plain-text compiler with responsive table layouts and 600px desktop containers.
- **Visual Drag-and-Drop / Block Email Builder**: 3-panel visual studio (`/editor`) with desktop/mobile viewport toggle, live block styling, and instant rendering.
- **Background Worker & BullMQ**: Out-of-band asynchronous processing with chunked recipient batching (concurrency: 5), live progress tracking, and resilient retry logic.

---

## 📁 Repository Structure

```
MailCraft/
├── apps/
│   ├── web/                     # Next.js 15 App Router (Frontend + REST API)
│   │   ├── app/
│   │   │   ├── api/v1/          # Production REST API endpoints
│   │   │   │   ├── guest/       # Session & email OTP verification
│   │   │   │   ├── brands/      # Brand profile & logo upload
│   │   │   │   ├── connections/ # Gmail & Brevo/SES connection management
│   │   │   │   ├── contacts/    # Manual, bulk, and CSV contact import
│   │   │   │   ├── templates/   # Template catalog & live rendering
│   │   │   │   ├── campaigns/   # Campaign lifecycle, tests, and analytics
│   │   │   │   ├── unsubscribe/ # RFC 8058 one-click unsubscribe
│   │   │   │   ├── webhooks/    # Brevo & SES delivery/bounce webhooks
│   │   │   │   └── health/      # Service healthcheck
│   │   │   ├── workspace/       # Interactive 5-tab guest workspace
│   │   │   ├── editor/          # 3-panel visual email designer
│   │   │   ├── templates/       # Interactive template catalog
│   │   │   ├── pricing/         # Transparent pricing & quota guide
│   │   │   ├── privacy/         # Privacy Policy
│   │   │   ├── terms/           # Terms of Service & anti-spam policy
│   │   │   ├── contact/         # Support inquiry form
│   │   │   ├── unsubscribe/     # Public one-click unsubscribe page
│   │   │   └── page.tsx         # Modern landing page
│   │   └── lib/                 # Session crypto, Redis queue & API helpers
│   └── worker/                  # BullMQ background campaign & test email processor
├── packages/
│   ├── shared-types/            # Full TypeScript interfaces for 9 domain models
│   ├── validation/              # Zod validation schemas for all requests
│   ├── database/                # Mongoose models & AES-256-GCM encryption vault
│   ├── email-renderer/          # 12 templates & responsive HTML/plain-text compiler
│   └── email-providers/         # Gmail OAuth, Brevo, SES & Mock provider adapters
├── docs/
│   ├── ARCHITECTURE.md          # Complete system architecture specification
│   ├── DATABASE.md              # MongoDB collections, indexes, and schemas
│   ├── API.md                   # REST API specification
│   ├── SECURITY.md              # Security, encryption & anti-spam compliance
│   └── plans/                   # Implementation blueprints
├── scripts/
│   ├── test-api-e2e.mjs         # End-to-end API verification suite
│   └── test-campaign-worker.mjs # Full BullMQ worker & campaign integration suite
├── .env.example                 # Environment variables specification
└── package.json                 # Monorepo root configuration
```

---

## 🎨 12 Production Email Templates

MailCraft ships with 12 handcrafted, bulletproof responsive email templates:
1. **Minimal Premium**: Clean typography, high-end branding, and focused single CTA.
2. **Product Drop**: Bold product showcase with hero imagery and dual CTAs.
3. **Flash Sale**: High-urgency discount banner, countdown badges, and coupon cards.
4. **Creator Newsletter**: Editorial content layout with thought leadership styling.
5. **Event Invitation**: Modern RSVP card with calendar details and location.
6. **Feature Announcement**: Product changelog highlights with visual badges.
7. **Customer Welcome**: Friendly warm onboarding note with getting-started steps.
8. **Feedback Request**: 5-star survey prompt with direct feedback links.
9. **Seasonal Special**: Festive promotional banner with coupon code block.
10. **Early Access VIP**: Exclusive insider invitation with gated access CTA.
11. **Re-engagement Winback**: "We miss you" promo with an exclusive discount.
12. **Milestone Celebration**: Metric celebration banner with community thank-you.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node 26)
- **pnpm**: v9+ (tested on pnpm 12)
- **MongoDB**: running locally or MongoDB Atlas (`mongodb://localhost:27017/mailcraft`)
- **Redis**: running locally or cloud Redis (`redis://localhost:6379`)

### 2. Setup & Installation
```bash
# Clone the repository
git clone <repo-url>
cd MailCraft

# Install all workspace dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Build packages and applications
pnpm build
```

### 3. Running Development Servers
```bash
# Terminal 1: Start Next.js web application
pnpm dev

# Terminal 2: Start BullMQ background worker
pnpm worker
```

Open [http://localhost:3000](http://localhost:3000) to open MailCraft!

---

## 🧪 Comprehensive Automated Testing

MailCraft includes automated end-to-end test suites verifying database persistence, AES-256-GCM encryption, OTP verification, BullMQ background queues, campaign batching, suppression filtering, and one-click unsubscribe:

```bash
# Run complete test suite (Database crypto + Full Worker & Campaign E2E)
pnpm test
```

### What `pnpm test` verifies:
- ✅ **Cryptographic Tokens & Session Hashing**: High-entropy session IDs with SHA-256 hashes.
- ✅ **AES-256-GCM Credential Encryption**: Encryption and authenticated decryption of provider secrets.
- ✅ **6-Digit OTP Generator & Hashing**: Anti-spoofing sender email verification.
- ✅ **Database Persistence**: Verification of 9 Mongoose schemas in MongoDB.
- ✅ **BullMQ Asynchronous Queues**: Spawns worker process and enqueues test emails and campaign broadcasts.
- ✅ **Chunked Batch Delivery**: Dispatches batches with rate pacing and suppression verification.
- ✅ **Suppression & Anti-Spam Compliance**: Verifies that unsubscribed recipients are blocked from future campaigns.
- ✅ **Live Campaign Analytics**: Queries delivered counts, open/bounce events, and delivery rates.
- ✅ **RFC 8058 / RFC 2369 Unsubscribe**: Tests public one-click unsubscribe endpoint and state transitions.

---

## 🛡️ Security & Privacy Notice
- **No plain-text credentials**: API keys and OAuth tokens are encrypted at rest with AES-256-GCM using unique 12-byte initialization vectors and 16-byte authentication tags.
- **Zero persistent session passwords**: Ephemeral guest sessions expire automatically after 7 days without activity.
- **Strict Channel Separation**: Gmail API is restricted to low-volume campaigns (< 500/day); Brevo/SES are required for high-volume promotional lists.
