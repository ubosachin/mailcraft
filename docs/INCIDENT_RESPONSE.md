# MailCraft Production Incident Response & On-Call Playbook

**Document Version:** 1.0.0  
**Updated:** November 2026

---

## 1. Incident Severity Definitions

| Severity | Definition | Target Response | Escalation Target |
|---|---|---|---|
| **P1 — Critical** | Complete service outage, data corruption, active security breach, or total queue failure. | **< 15 minutes** | Lead Architect, Security Engineer |
| **P2 — Major** | Partial service degradation, high email bounce spike (> 5%), provider API outages, or webhook delays. | **< 30 minutes** | Backend Engineer, Infrastructure Team |
| **P3 — Minor** | Non-critical UI glitch, individual slow endpoint, or low-priority background warning. | **< 4 hours** | On-call Engineer |

---

## 2. On-Call Runbooks

### Runbook 1: MongoDB Outage or Readiness Failure
* **Symptoms**: `/health/ready` returns HTTP 503 with `"mongodb": { "status": "disconnected" }`.
* **Action Steps**:
  1. Check MongoDB Atlas cluster status dashboard (https://cloud.mongodb.com).
  2. Verify network access allowlist has not expired.
  3. Inspect Atlas cluster metrics for CPU/RAM saturation or connection limit exhaustion.
  4. If primary node failed, confirm replica set election succeeded.
  5. Restart web and worker processes if connections remain stale.

---

### Runbook 2: Redis Outage or Queue Stalling
* **Symptoms**: `/health/ready` returns 503 (`redis: disconnected`) or `/api/v1/health/metrics` shows growing `waiting` backlog with zero `active` jobs.
* **Action Steps**:
  1. Check Redis hosting dashboard (Upstash, Railway, or ElastiCache).
  2. Inspect memory usage: ensure eviction policy is set to `noeviction`.
  3. Check worker process logs (`apps/worker`):
     ```bash
     tail -f /path/to/worker.log
     ```
  4. If worker crashed, restart the worker service. Stalled recipients in status `'processing'` will automatically be reset to `'queued'` and resumed.

---

### Runbook 3: Deliverability Reputation Alert (Complaints > 0.10% or Bounces > 5.0%)
* **Symptoms**: Deliverability Center (`/analytics/deliverability`) displays reputation warnings.
* **Action Steps**:
  1. Identify affected campaign ID from `/analytics/deliverability`.
  2. Pause any running campaigns from that sender immediately via `POST /api/v1/campaigns/:id/pause`.
  3. Inspect contact source: verify if recipient list was imported without verified opt-in consent.
  4. Ensure all bounced and complaining addresses are present in the global `suppressions` collection.
  5. Check domain SPF and DMARC alignment via `/api/v1/settings/email-authentication/check`.

---

### Runbook 4: Security Compromise & Credential Rotation
* **Symptoms**: `ENCRYPTION_KEY` or `APP_SECRET` suspected compromised.
* **Action Steps**:
  1. Generate new 64-character hex encryption key:
     ```bash
     openssl rand -hex 32
     ```
  2. Configure `ENCRYPTION_KEY_V2=<new-key>` and `ENCRYPTION_KEY_VERSION=2` in hosting dashboard.
  3. Invalidate all active guest sessions by purging `guest_sessions` collection:
     ```javascript
     db.guest_sessions.updateMany({}, { $set: { status: 'revoked' } });
     ```
  4. Rotate third-party API keys (Brevo API key, AWS IAM keys, Google OAuth client secret).
  5. Deploy services and verify `/health/ready` returns 200.

---

## 3. Post-Incident Review (Postmortem) Template

Each P1 or P2 incident requires a postmortem within 48 hours documenting:
- **Incident Summary**: Date, duration, impact.
- **Root Cause Analysis (5 Whys)**.
- **Timeline**: Chronological events from detection to resolution.
- **Remediation & Action Items**: Preventative measures with assigned owners.

