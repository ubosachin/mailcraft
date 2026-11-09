# MailCraft Master Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and launch MailCraft, a modern guest-first promotional email marketing platform with visual templates, recipient validation, dual Gmail + Brevo sending channels, and real-time delivery analytics.

**Architecture:** A TypeScript monorepo with Next.js 15 App Router providing the guest workspace and API endpoints, a standalone persistent Node.js worker powered by BullMQ and Redis for queue-based batch delivery, MongoDB with Mongoose for guest sessions and campaigns, and AES-256-GCM encrypted provider credentials.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, MongoDB (Mongoose), Redis, BullMQ, Zod, Nodemailer, Google OAuth 2.0 / Gmail API, Brevo API.

---

## Phased Execution Roadmap

- **Phase 1: Foundation & Guest Workspace** (Current Focus)
  - Monorepo structure, MongoDB schemas, SHA-256 guest token lifecycle, AES-256-GCM encryption vault, Brand APIs, and responsive landing & workspace UI.
- **Phase 2: Templates & Visual Email Designer**
  - 12 production templates, JSON-to-HTML email compiler with inline styles, preview engine (mobile/desktop).
- **Phase 3: Recipient Hub & Provider Connections**
  - Gmail OAuth PKCE flow, Brevo API integration, CSV/XLSX recipient parser, syntax deduplicator, and suppression registry.
- **Phase 4: BullMQ Campaign Engine**
  - Redis queues, rate-limited batch worker, test email delivery, pause/resume, and retry mechanisms.
- **Phase 5: Analytics & Delivery Tracking**
  - Webhook handlers, bounce/click trackers, unsubscribe pages, and real-time stats dashboard.
- **Phase 6: Production Hardening & Deployment**
  - Docker compose, Vercel frontend config, Railway/Render worker config, end-to-end smoke tests.

---

## Phase 1 Implementation Tasks

### Task 1: Monorepo Setup & Workspace Configuration

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env.local`

**Step 1: Write root workspace configuration and dependencies**
Set up pnpm workspace connecting `apps/*` and `packages/*`.

**Step 2: Initialize lockfile and verify workspace discovery**
Run: `pnpm install`
Expected: Successful package resolution without errors.

---

### Task 2: Shared Types Package (`packages/shared-types`)

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/session.ts`
- Create: `packages/shared-types/src/brand.ts`
- Create: `packages/shared-types/src/campaign.ts`
- Create: `packages/shared-types/src/template.ts`
- Create: `packages/shared-types/src/recipient.ts`
- Create: `packages/shared-types/src/provider.ts`

**Step 1: Define TypeScript interfaces for all 9 collections and API payloads**
Model `IGuestSession`, `IBrand`, `IEmailConnection`, `IContact`, `ITemplate`, `ICampaign`, `ICampaignRecipient`, `ISuppression`, and `ICampaignEvent`.

**Step 2: Build and export type definitions**
Compile types using `tsc`.

---

### Task 3: Validation Package (`packages/validation`)

**Files:**
- Create: `packages/validation/package.json`
- Create: `packages/validation/tsconfig.json`
- Create: `packages/validation/src/index.ts`
- Create: `packages/validation/src/session.schema.ts`
- Create: `packages/validation/src/brand.schema.ts`
- Create: `packages/validation/src/contact.schema.ts`
- Create: `packages/validation/src/campaign.schema.ts`

**Step 1: Write Zod schemas for request payloads**
Strict validation for emails, URLs, Hex colors, OTP codes, and campaign parameters.

**Step 2: Verify validation logic with unit tests**
Ensure invalid formats reject cleanly with descriptive error messages.

---

### Task 4: Database Models & Security Vault (`packages/database`)

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/connection.ts`
- Create: `packages/database/src/encryption.ts`
- Create: `packages/database/src/models/GuestSession.ts`
- Create: `packages/database/src/models/Brand.ts`
- Create: `packages/database/src/models/EmailConnection.ts`
- Create: `packages/database/src/models/Contact.ts`
- Create: `packages/database/src/models/Template.ts`
- Create: `packages/database/src/models/Campaign.ts`
- Create: `packages/database/src/models/CampaignRecipient.ts`
- Create: `packages/database/src/models/Suppression.ts`
- Create: `packages/database/src/models/CampaignEvent.ts`

**Step 1: Write AES-256-GCM encryption helpers and SHA-256 session hashers**
Implement `encryptCredentials` and `decryptCredentials` with initialization vector and authentication tag.

**Step 2: Write Mongoose schemas with compound indexes and TTL rules**

**Step 3: Test database connection and encryption against local MongoDB**
Run integration script verifying CRUD and token encryption.

---

### Task 5: Next.js 15 Web Application & Guest API (`apps/web`)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/lib/session.ts`
- Create: `apps/web/lib/api-response.ts`
- Create: `apps/web/app/api/v1/health/route.ts`
- Create: `apps/web/app/api/v1/guest/start/route.ts`
- Create: `apps/web/app/api/v1/guest/me/route.ts`
- Create: `apps/web/app/api/v1/guest/verify-email/route.ts`
- Create: `apps/web/app/api/v1/guest/verify-email/confirm/route.ts`
- Create: `apps/web/app/api/v1/guest/refresh/route.ts`
- Create: `apps/web/app/api/v1/guest/session/route.ts`
- Create: `apps/web/app/api/v1/brands/route.ts`
- Create: `apps/web/app/api/v1/brands/current/route.ts`

**Step 1: Implement session middleware & cryptographic cookie handler**
Automatically create or retrieve guest session with `HttpOnly` cookie.

**Step 2: Implement guest authentication and brand persistence routes**

**Step 3: Implement Landing Page (`apps/web/app/page.tsx`)**
Hero, quickstart form, value propositions, template carousel preview, and feature showcase.

**Step 4: Implement Guest Workspace (`apps/web/app/workspace/page.tsx`)**
Interactive workspace containing:
- Guest session status banner (Token Hash, Verified Email status, TTL countdown)
- Brand configuration card with real-time color and logo preview
- Email verification OTP modal
- Sending channel preview (Gmail vs Brevo)
- Recipient and Template preview tabs

**Step 5: Run Next.js build and test guest session creation end-to-end**
Run: `pnpm build`
Verify all routes compile and render cleanly.
