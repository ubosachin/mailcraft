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

## 5. Template & Rendering Endpoints

### `GET /api/v1/templates`
Retrieves the template catalog with filtering, search, and category metrics.
- **Query Parameters**:
  - `category`: Filter by category (`ecommerce`, `fashion`, `technology`, `food`, `corporate`, `festivals`, `discounts`, `product_launches`, `welcome`)
  - `q` or `search`: Search name, description, and features
  - `sort`: `name`, `newest`, `popular`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "total": 12,
      "categoryCounts": {
        "all": 12,
        "ecommerce": 1,
        "fashion": 2,
        "technology": 1,
        "food": 1,
        "corporate": 2,
        "festivals": 1,
        "discounts": 2,
        "product_launches": 1,
        "welcome": 1
      },
      "templates": [
        {
          "id": "672f0...",
          "name": "Minimal Premium",
          "slug": "minimal-premium",
          "category": "ecommerce",
          "thumbnail": "https://images.unsplash.com/...",
          "description": "Ultra-clean editorial layout...",
          "isPremium": false,
          "version": 1
        }
      ]
    }
  }
  ```

### `GET /api/v1/templates/:id`
Retrieves a single template definition and its full structured editor schema by MongoDB ObjectId or URL slug (e.g., `minimal-premium`).

### `GET /api/v1/templates/:id/preview`
Renders a live email preview with the user's active brand settings.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "template": { "id": "...", "name": "Minimal Premium", "slug": "minimal-premium" },
      "html": "<!DOCTYPE html>...",
      "text": "Plain text fallback...",
      "subject": "Minimalist Leather Folio",
      "preheader": "Designed for discerning creatives",
      "htmlByteSize": 12938,
      "textByteSize": 412
    }
  }
  ```

### `POST /api/v1/templates/:id/clone`
Clones a chosen template into a new draft campaign for the current guest session.
- **Request Body**:
  ```json
  {
    "campaignName": "Spring Sale 2026"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "data": {
      "campaignId": "672f4...",
      "campaignName": "Spring Sale 2026",
      "status": "draft",
      "templateId": "672f0..."
    }
  }
  ```

### `POST /api/v1/email-renderer/render`
Standalone email compiler endpoint. Accepts either a custom editor schema or a template slug, combines it with brand tokens and recipient variables, and compiles production-ready HTML/text.
- **Request Body**:
  ```json
  {
    "templateId": "festive-special",
    "brand": {
      "brandName": "Acme Co",
      "primaryColor": "#B45309",
      "footerAddress": "123 Main St"
    },
    "recipient": {
      "firstName": "Alex",
      "email": "alex@example.com"
    }
  }
  ```
- **Response** `200 OK`: Returns `{ html, text, subject, preheader, htmlByteSize, textByteSize }`.

### `POST /api/v1/email-renderer/validate`
Validates an email editor schema against strict Zod constraints (block types, container widths 320-800px, color codes).
- **Request Body**:
  ```json
  {
    "schema": {
      "version": 1,
      "settings": { "contentWidth": 600 },
      "blocks": [{ "id": "b1", "type": "logo", "props": {} }]
    }
  }
  ```
- **Response** `200 OK`: Returns `{ isValid: true, blockCount: 1 }`.

---

## 6. Campaign & Delivery Endpoints

### `POST /api/v1/campaigns`
Creates a new draft campaign tied to a template and brand.

### `GET /api/v1/campaigns/:id`
Retrieves full campaign data including current `editorData` structured schema, delivery status, and brand assets.

### `PUT /api/v1/campaigns/:id` (and `PATCH`)
Saves editor changes including `campaignName`, `subject`, `preheader`, and structured `editorData` JSON schema. Used by the visual editor's debounced autosave engine.

### `POST /api/v1/upload/image`
Uploads promotional images and banners. Supports Cloudinary cloud storage or high-performance base64 data URI representations with MIME and 5MB size validation.
- **Request**: `multipart/form-data` with `file`
- **Response** `200 OK`: `{ url, originalName, size, mimeType }`

### `POST /api/v1/campaigns/:id/render`
Generates mobile-optimized, Gmail-safe HTML preview from structured editor JSON.

### `POST /api/v1/campaigns/:id/test`
Dispatches a single test email to the sender's verified address.

### `POST /api/v1/campaigns/:id/send`
Submits campaign to BullMQ queue for batch processing with duplicate prevention.

