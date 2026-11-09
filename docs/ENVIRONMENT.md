# MailCraft Environment & Secrets Configuration Guide

**Version:** 1.0.0  
**Updated:** November 2026

This document defines all environment variables used across the MailCraft platform, their constraints, security guidelines, and key rotation runbooks.

---

## 1. Environment Variable Reference Table

| Variable Name | Required | Default / Format | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` / `production` / `test` | Runtime execution environment. |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Canonical public URL of the application. Used for tracking URLs and redirect targets. |
| `API_BASE_URL` | Optional | `${NEXT_PUBLIC_APP_URL}/api/v1` | Public API base path. |
| `APP_SECRET` | **Yes** | 32+ char string | Salt and signing secret for guest session verification and HMAC state hashes. |
| `ENCRYPTION_KEY` | **Yes** | 64-char hex (32 bytes) | **AES-256-GCM** master key used to encrypt and decrypt provider credentials at rest. |
| `ENCRYPTION_KEY_VERSION`| Optional | `1` | Key version integer for key rotation tracking. |
| `MONGODB_URI` | **Yes** | `mongodb://` or `mongodb+srv://` | MongoDB database connection URI. |
| `MONGODB_MAX_POOL_SIZE`| Optional | `10` (web) / `25` (worker) | Maximum concurrent connections in Mongoose pool. |
| `REDIS_URL` | **Yes** | `redis://` or `rediss://` | Redis URI for BullMQ queues and rate limiter sliding windows. |
| `GOOGLE_CLIENT_ID` | Optional | Google Client ID | OAuth 2.0 Client ID for Gmail API sending. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google Client Secret | OAuth 2.0 Client Secret. |
| `GOOGLE_REDIRECT_URI` | Optional | `${APP_URL}/api/v1/connections/gmail/callback` | OAuth redirect callback URL. |
| `BREVO_API_KEY` | Optional | `xkeysib-...` | Brevo REST API v3 key for high-volume promotional sending. |
| `AWS_REGION` | Optional | e.g. `us-east-1` | AWS SES datacenter region. |
| `AWS_ACCESS_KEY_ID` | Optional | `AKIA...` | AWS IAM access key with restricted SES sending privileges. |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS IAM secret key | AWS IAM secret. |
| `CLOUDINARY_CLOUD_NAME` | Optional | String | Cloudinary cloud name for uploaded campaign images. |
| `CLOUDINARY_API_KEY` | Optional | String | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | String | Cloudinary API secret. |
| `SENTRY_DSN` | Optional | `https://...@sentry.io/...` | Sentry error reporting endpoint. |

---

## 2. Secrets Management & Security Principles

1. **Zero Raw Secret Commits**:
   Never commit `.env`, `.env.local`, `.env.development`, or `.env.production` to source control. Only example templates (`.env.*.example`) are versioned.
2. **Never Expose Secrets in `NEXT_PUBLIC_`**:
   Only client-safe values like `NEXT_PUBLIC_APP_URL` are prefixed with `NEXT_PUBLIC_`. Encryption keys, provider secrets, and database URIs must NEVER carry the `NEXT_PUBLIC_` prefix.
3. **Encrypted Credentials at Rest**:
   Third-party API keys and OAuth tokens entered by guest users are encrypted with AES-256-GCM and stored in MongoDB with their IV and authentication tag.
4. **Log Redaction**:
   All application loggers recursively redact keys matching `token`, `key`, `secret`, `password`, `authorization`, `iv`, `tag`, and `data`.

---

## 3. Cryptographic Key Generation

### Master AES-256 Encryption Key
Generate a secure 256-bit (32-byte) hex string:
```bash
openssl rand -hex 32
# Example output: a3f88c5d921b7740e5e01b63da90479b1836a9ef27db410c5bc68b826f437012
```

### Application Secret
Generate a high-entropy application secret string:
```bash
openssl rand -base64 32
```

---

## 4. Key Rotation Procedures

MailCraft supports key rotation via the `credentialVersion` attribute stored alongside every encrypted record:

1. **Current Key (Version 1)**: `ENCRYPTION_KEY` in environment.
2. **Rotating to Version 2**:
   - Set `ENCRYPTION_KEY_V2=<new-64-hex-key>`.
   - Set `ENCRYPTION_KEY_VERSION=2`.
   - The encryption utility checks the document's `credentialVersion`:
     - If decrypting a version 1 record, it uses `ENCRYPTION_KEY_V1`.
     - When saving or updating credentials, it encrypts using `ENCRYPTION_KEY_V2` and marks `credentialVersion: 2`.
   - A background migration can re-encrypt all active records from version 1 to version 2 without service interruption.

