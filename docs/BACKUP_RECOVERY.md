# MailCraft Backup & Disaster Recovery Guide

**Document Version:** 1.0.0  
**Updated:** November 2026

---

## 1. Disaster Recovery Objectives

| Metric | Target | Description |
|---|---|---|
| **RPO (Recovery Point Objective)** | **< 15 minutes** | Maximum allowable data loss during an unexpected hardware or cloud failure. |
| **RTO (Recovery Time Objective)** | **< 30 minutes** | Maximum allowable downtime required to restore services to operational status. |

---

## 2. MongoDB Atlas Backup & Restore Procedures

### 2.1 Continuous Cloud Backups
- **Continuous Backup Policy**: MongoDB Atlas automated snapshots taken every 1 hour, retained for 7 days.
- **Point-in-Time Restore (PITR)**: Enables rolling back database state to any specific second within the last 7 days.

### 2.2 Restore Verification Runbook
To restore a backup during an incident or scheduled disaster recovery drill:
1. Log in to **MongoDB Atlas Dashboard** &rarr; **Clusters** &rarr; **Backup**.
2. Select the snapshot or specific timestamp prior to incident occurrence.
3. Click **Restore** &rarr; **Restore to a New Cluster** (e.g. `mailcraft-prod-restored`).
4. Wait for cluster initialization (~10-15 minutes).
5. Update `MONGODB_URI` environment variable in Vercel and Worker service configurations.
6. Verify `/health/ready` returns HTTP 200.

---

## 3. Redis Queue & Stalled Job Recovery

BullMQ maintains state inside Redis. In the event of a Redis outage or restart:
1. **AOF / RDB Persistence**: Redis restarts and restores queues from disk (`appendonly yes`).
2. **Stalled Recipient Recovery**:
   When worker processes resume, `processCampaignJob` automatically executes:
   ```ts
   await CampaignRecipient.updateMany(
     { campaignId, status: 'processing' },
     { $set: { status: 'queued' } }
   );
   ```
   Recipients that were interrupted mid-flight are reset to `queued` and dispatched without dropping messages.
3. **Dead-Letter Queue (DLQ)**:
   Any jobs that fail 3 consecutive times are moved to `mailcraft-campaigns-dlq` for operator inspection.

---

## 4. Cryptographic Key Recovery & Rotation

- The master `ENCRYPTION_KEY` must be securely escrowed in a secrets vault (e.g. AWS Secrets Manager, 1Password Secrets Automation, or HashiCorp Vault).
- If the encryption key is compromised, execute the key rotation procedure documented in [`docs/ENVIRONMENT.md`](file:///Users/sachin/Desktop/MailCraft/docs/ENVIRONMENT.md).

