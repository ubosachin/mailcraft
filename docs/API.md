# MailCraft REST API Specification

**Base URL**: `/api/v1`

All endpoints operating within a guest workspace require a valid guest session token transmitted via either:
1. `mailcraft_session` HttpOnly Cookie (automatic in browser)
2. `Authorization: Bearer <session_token>` header

---

## 1. Guest Session Endpoints

### `POST /api/v1/guest/start`
Initializes a new guest workspace session.
- **Request Body**:
  ```json
  {
    "brandName": "Acme Brand",       // optional initial seed
    "senderEmail": "hello@acme.com"   // optional initial seed
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "session": {
      "id": "672f0...",
      "status": "active",
      "verifiedEmail": null,
      "createdAt": "2026-11-09T05:00:00.000Z",
      "expiresAt": "2026-11-16T05:00:00.000Z"
    },
    "token": "mc_sess_9a8f..." // also set as HttpOnly cookie
  }
  ```

### `GET /api/v1/guest/me`
Retrieves current session details, verification status, and linked brand info.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "session": {
      "id": "672f0...",
      "status": "active",
      "verifiedEmail": "founder@acme.com",
      "expiresAt": "2026-11-16T05:00:00.000Z"
    },
    "brand": {
      "id": "672f1...",
      "brandName": "Acme Brand",
      "senderName": "Jane Doe",
      "senderEmail": "founder@acme.com",
      "primaryColor": "#4F46E5",
      "secondaryColor": "#10B981"
    }
  }
  ```

### `POST /api/v1/guest/verify-email`
Sends a 6-digit verification OTP to the sender's email to confirm ownership.
- **Request Body**:
  ```json
  {
    "email": "founder@acme.com"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "message": "Verification code sent to founder@acme.com",
    "expiresInSeconds": 600
  }
  ```

### `POST /api/v1/guest/verify-email/confirm`
Confirms the OTP and binds the verified email to the session.
- **Request Body**:
  ```json
  {
    "email": "founder@acme.com",
    "code": "849201"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "verified": true,
    "verifiedEmail": "founder@acme.com"
  }
  ```

### `POST /api/v1/guest/refresh`
Refreshes session expiration by 7 days.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "expiresAt": "2026-11-16T10:00:00.000Z"
  }
  ```

### `DELETE /api/v1/guest/session`
Revokes active session and clears cookies.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "message": "Session terminated"
  }
  ```

---

## 2. Brand Endpoints

### `POST /api/v1/brands`
Creates or seeds the brand profile for the current session.
- **Request Body**:
  ```json
  {
    "brandName": "Aurora Studio",
    "senderName": "Sarah Connor",
    "senderEmail": "sarah@aurora.io",
    "website": "https://aurora.io",
    "logoUrl": "https://aurora.io/logo.png",
    "primaryColor": "#6366F1",
    "secondaryColor": "#EC4899",
    "footerAddress": "123 Market St, Suite 400, San Francisco, CA"
  }
  ```

### `GET /api/v1/brands/current`
Fetches the brand associated with the active guest workspace.

### `PATCH /api/v1/brands/:id`
Updates brand profile details with session ownership enforcement.

---

## 3. Connection & Provider Endpoints

### `GET /api/v1/connections/providers`
Returns supported providers and capability matrix (Gmail API vs Brevo vs Amazon SES).

### `GET /api/v1/connections/gmail/start`
Generates Google OAuth URL with PKCE and state signature.

### `GET /api/v1/connections/gmail/callback`
Exchanges OAuth authorization code for encrypted refresh tokens.

### `POST /api/v1/connections/provider`
Connects third-party bulk providers (Brevo, SES) with AES-256 encrypted API keys.

---

## 4. Contact & Recipient Management Endpoints

### `POST /api/v1/contacts/bulk`
Validates and imports contact addresses with automatic duplicate removal and syntax validation.
- **Request Body**:
  ```json
  {
    "contacts": [
      { "email": "alice@company.com", "name": "Alice" },
      { "email": "bob@company.com", "name": "Bob" }
    ],
    "consentConfirmed": true
  }
  ```

### `POST /api/v1/contacts/validate`
Analyzes raw list (pasted or CSV) and returns summary breakdown:
- Total submitted
- Valid RFC-compliant emails
- Duplicates removed
- Suppressed count
- Eligible count

---

## 5. Template & Campaign Endpoints

### `GET /api/v1/templates`
Retrieves pre-designed, responsive marketing templates (12 categories).

### `POST /api/v1/campaigns`
Creates a new draft campaign tied to a template and brand.

### `POST /api/v1/campaigns/:id/render`
Generates mobile-optimized, Gmail-safe HTML preview from structured editor JSON.

### `POST /api/v1/campaigns/:id/test`
Dispatches a single test email to the sender's verified address.

### `POST /api/v1/campaigns/:id/send`
Submits campaign to BullMQ queue for batch processing with duplicate prevention.
