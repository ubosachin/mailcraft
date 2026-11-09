# MailCraft 🚀

> **No-login promotional email creation and delivery platform**

MailCraft allows businesses, startups, creators, and small brands to design professional marketing emails and send them to their own permission-based recipient lists — **without mandatory account registration**.

---

## 🌟 Key Architecture & Philosophy

- **Guest Mode as Default**: High-entropy 256-bit cryptographically secure tokens stored in `HttpOnly`, `SameSite=Lax` cookies; database stores solely `SHA-256` token hashes.
- **Dual Sending Channels**:
  - **Google OAuth (Gmail API)**: Low-volume, personal sender delivery (< 500/day).
  - **Brevo & Amazon SES**: High-throughput promotional blast delivery backed by Redis & BullMQ workers.
- **Security & Anti-Abuse**:
  - AES-256-GCM authenticated encryption for provider tokens and API keys.
  - Mandatory sender email OTP ownership verification before campaign dispatch.
  - Global suppression list and one-click `List-Unsubscribe` headers.
  - Duplicate detection and syntax validation.
- **12 Predefined Themes**: JSON schema-based layouts converted to bulletproof, mobile-ready HTML.

---

## 📁 Repository Structure

```
MailCraft/
├── apps/
│   ├── web/                     # Next.js 15 App Router (Frontend + REST API)
│   │   ├── app/
│   │   │   ├── api/v1/          # REST API endpoints
│   │   │   │   ├── guest/       # Session & email OTP verification
│   │   │   │   ├── brands/      # Brand profile management
│   │   │   │   └── health/      # Service healthcheck
│   │   │   ├── workspace/       # Interactive guest workspace
│   │   │   └── page.tsx         # High-converting landing page
│   │   └── lib/                 # Session crypto, cookie & API response helpers
│   └── worker/                  # BullMQ background worker (Phase 4)
├── packages/
│   ├── shared-types/            # Shared TypeScript definitions for all 9 models
│   ├── validation/              # Zod schemas for all API requests
│   └── database/                # MongoDB Mongoose models & AES-256-GCM encryption vault
├── docs/
│   ├── ARCHITECTURE.md          # Complete system architecture
│   ├── DATABASE.md              # MongoDB collections, indexes, and schemas
│   ├── API.md                   # REST API specification
│   ├── SECURITY.md              # Security, encryption & anti-spam guidelines
│   └── plans/                   # Phased implementation roadmaps
├── .env.example                 # Environment variables specification
└── package.json                 # Monorepo root configuration
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node 26)
- **pnpm**: v9+ (tested on pnpm 12)
- **MongoDB**: running locally or MongoDB Atlas cluster (`mongodb://localhost:27017/mailcraft`)

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

# Start Next.js development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page and start a guest campaign!

---

## 🧪 Testing Phase 1 Foundation

Run the automated integration test verifying cryptographic tokens, AES-256-GCM encryption, OTP hashing, and MongoDB persistence:

```bash
pnpm --filter database build && node packages/database/dist/test-phase1.js
```
