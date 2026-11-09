# MailCraft Performance & Scalability Architecture

**Document Version:** 1.0.0  
**Updated:** November 2026

---

## 1. Frontend Performance & Bundle Optimization

Next.js 15 App Router architecture provides aggressive code-splitting and small initial payload sizes:

- **First Load JS**: Only **102 kB** shared across all routes.
- **Route-Level Splitting**: Heavy components (e.g. the visual email editor `/editor/[campaignId]` at 38.9 kB) are isolated to their specific routes and dynamically imported.
- **Server Components**: Marketing landing pages (`/`, `/pricing`, `/terms`, `/privacy`) and documentation viewers are rendered statically or on the server with zero client JavaScript overhead.
- **Image Optimization**: Custom images configured with Next.js `remotePatterns` for Cloudinary and Unsplash CDN caching.
- **Debounced Editor Autosave**: Visual editor changes are debounced by 800ms to eliminate redundant save network requests while preventing data loss.

---

## 2. Database Optimization & Indexing Strategy

### 2.1 Query Patterns & Compound Indexes
Every MongoDB collection includes compound indexes matching specific workload query patterns:

| Collection | Compound Index | Query Purpose |
|---|---|---|
| `guest_sessions` | `{ sessionTokenHash: 1 }` (unique) | O(1) session resolution on every authenticated request |
| `contacts` | `{ sessionId: 1, normalizedEmail: 1 }` (unique) | Fast deduplication and conflict prevention during bulk imports |
| `contacts` | `{ sessionId: 1, consentStatus: 1 }` | Fast audience filtering during campaign launch |
| `campaign_recipients` | `{ campaignId: 1, email: 1 }` (unique) | Prevents duplicate recipient insertions within the same campaign |
| `campaign_recipients` | `{ campaignId: 1, status: 1 }` | Fast chunk fetching for workers (`status: { $in: ['pending', 'queued'] }`) |
| `email_events` | `{ provider: 1, eventId: 1 }` (unique) | Idempotent webhook processing; eliminates duplicate event counting |
| `email_events` | `{ campaignId: 1, eventTimestamp: -1 }` | Real-time campaign timeline aggregations |
| `suppressions` | `{ emailHash: 1, scope: 1 }` | Fast pre-send suppression checks |

### 2.2 Connection Pooling & Resource Limits
- Web / API Serverless: `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000` with global connection caching to prevent connection exhaustion during traffic bursts.
- Persistent Worker: `maxPoolSize: 25` to support concurrent batch dispatches.

### 2.3 Automated Data Pruning (TTL Indexes)
- `guest_sessions`: TTL index on `expiresAt` with `{ expires: 0 }`.
- `tracking_tokens`: TTL index on `expiresAt` with `{ expires: 0 }`.
- `webhook_event_logs`: TTL index on `receivedAt` with `{ expires: 2592000 }` (30 days retention).

---

## 3. Worker Throughput & Sending Pacing

- **Batch Chunking**: Campaigns process recipients in batches of 25.
- **In-Flight Re-check**: Real-time suppression check performed immediately before delivery.
- **Pacing**: 20ms pause between individual provider calls to maintain compliance with provider rate limits:
  $$\text{Throughput} \approx 50 \text{ emails/sec per worker instance}$$
- **Horizontal Scalability**: Additional worker instances can be spun up on Railway or Kubernetes. BullMQ ensures jobs are distributed across instances without duplicate dispatches.

