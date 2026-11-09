# MailCraft Database Specification (MongoDB)

MailCraft utilizes MongoDB as its primary document datastore. The schema is optimized around guest sessions, robust email delivery tracking, deduplication, and suppression handling.

---

## 1. Collections & Data Models

### 1.1 `guest_sessions`
Tracks temporary guest workspaces and expiration lifecycle.
```typescript
interface IGuestSession {
  _id: ObjectId;
  sessionTokenHash: string; // SHA-256 of the raw cookie token (unique)
  verifiedEmail?: string;    // Bound sender email after OTP verification
  verificationCodeHash?: string;
  verificationCodeExpiresAt?: Date;
  status: 'active' | 'expired' | 'revoked';
  ipAddressHash?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;          // TTL indexed (default: 7 days)
  lastActivityAt: Date;
}
```

### 1.2 `brands`
Stores brand profile, typography, colors, and asset references.
```typescript
interface IBrand {
  _id: ObjectId;
  sessionId: ObjectId;      // References guest_sessions._id
  brandName: string;
  senderName: string;
  senderEmail: string;
  website?: string;
  logoUrl?: string;
  primaryColor: string;     // Hex color code (e.g., #4F46E5)
  secondaryColor: string;   // Hex color code (e.g., #10B981)
  footerAddress?: string;   // Physical address for CAN-SPAM compliance
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    website?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 `email_connections`
Stores encrypted connection credentials for sending providers.
```typescript
interface IEmailConnection {
  _id: ObjectId;
  sessionId: ObjectId;
  provider: 'gmail' | 'brevo' | 'ses';
  senderEmail: string;
  encryptedCredentials: {
    iv: string;             // Hex string (12 or 16 bytes)
    tag: string;            // AES-GCM authentication tag
    data: string;           // Ciphertext payload
  };
  credentialVersion: number;
  status: 'connected' | 'disconnected' | 'revoked';
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.4 `contacts`
Manages recipient lists with explicit opt-in and suppression statuses.
```typescript
interface IContact {
  _id: ObjectId;
  sessionId: ObjectId;
  email: string;            // Normalized lowercase
  name?: string;
  consentStatus: 'opted_in' | 'unknown' | 'unsubscribed';
  consentSource: string;    // e.g., 'csv_import', 'manual_entry'
  consentAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.5 `templates`
Centralized repository of responsive, email-client-proof templates.
```typescript
interface ITemplate {
  _id: ObjectId;
  name: string;
  slug: string;             // Unique identifier (e.g., 'minimal-premium')
  category: 'ecommerce' | 'fashion' | 'technology' | 'food' | 'corporate' | 'festivals' | 'discounts' | 'product_launches';
  thumbnail: string;
  description: string;
  editorSchema: {
    settings: {
      background: string;
      contentWidth: number;
      fontFamily: string;
    };
    blocks: Array<{
      id: string;
      type: string;
      data: Record<string, unknown>;
    }>;
  };
  htmlTemplate?: string;
  isActive: boolean;
  isPremium: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.6 `campaigns`
Top-level campaign entity representing an email marketing broadcast.
```typescript
interface ICampaign {
  _id: ObjectId;
  sessionId: ObjectId;
  brandId: ObjectId;
  connectionId?: ObjectId;
  campaignName: string;
  subject: string;
  preheader?: string;
  templateId?: ObjectId;
  editorData: Record<string, unknown>; // Serialized builder JSON
  renderedHtml?: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'queued' | 'sending' | 'completed' | 'paused' | 'failed' | 'cancelled';
  stats: {
    accepted: number;
    delivered: number;
    bounced: number;
    clicked: number;
    unsubscribed: number;
    failed: number;
  };
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.7 `campaign_recipients`
Batch delivery tracking per individual contact.
```typescript
interface ICampaignRecipient {
  _id: ObjectId;
  campaignId: ObjectId;
  contactId?: ObjectId;
  email: string;
  status: 'pending' | 'queued' | 'accepted' | 'delivered' | 'bounced' | 'failed' | 'unsubscribed';
  providerMessageId?: string;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}
```

### 1.8 `suppressions`
Global and session-level unsubscribe and bounce registry.
```typescript
interface ISuppression {
  _id: ObjectId;
  emailHash: string;        // SHA-256 for fast indexed lookups
  emailEncrypted: string;   // AES-GCM encrypted original address
  reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual';
  scope: 'global' | 'session';
  sessionId?: ObjectId;
  createdAt: Date;
}
```

### 1.9 `campaign_events`
Audit trail of delivery lifecycle, webhooks, and recipient interactions.
```typescript
interface ICampaignEvent {
  _id: ObjectId;
  campaignId: ObjectId;
  recipientId?: ObjectId;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}
```

---

## 2. Database Indexes

| Collection | Key(s) | Type / Options | Purpose |
| :--- | :--- | :--- | :--- |
| `guest_sessions` | `{ sessionTokenHash: 1 }` | Unique | Fast session authentication |
| `guest_sessions` | `{ expiresAt: 1 }` | TTL index (`expireAfterSeconds: 0`) | Automatic cleanup of stale sessions |
| `brands` | `{ sessionId: 1 }` | Standard | Session brand lookup |
| `email_connections` | `{ sessionId: 1, provider: 1 }` | Standard | Provider lookup per session |
| `contacts` | `{ sessionId: 1, email: 1 }` | Unique | Prevent duplicate contacts in session |
| `templates` | `{ slug: 1 }` | Unique | Template lookup |
| `templates` | `{ category: 1, isActive: 1 }` | Standard | Template gallery filtering |
| `campaigns` | `{ sessionId: 1, createdAt: -1 }` | Standard | Guest campaign history |
| `campaign_recipients` | `{ campaignId: 1, email: 1 }` | Unique | Prevent duplicate delivery in campaign |
| `campaign_recipients` | `{ campaignId: 1, status: 1 }` | Standard | Batch worker queries & counts |
| `suppressions` | `{ emailHash: 1, scope: 1 }` | Standard | Fast suppression verification |
| `campaign_events` | `{ campaignId: 1, occurredAt: -1 }` | Standard | Real-time event analytics |
