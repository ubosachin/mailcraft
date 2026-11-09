# MailCraft Deliverability & Sender Reputation Guide

## 1. Introduction to Email Deliverability

Deliverability is the measurement of how successfully outbound promotional emails reach subscribers' primary inboxes rather than spam folders or being blocked at the gateway.

Mailbox providers (Google Workspace, Yahoo Mail, Microsoft Outlook, Apple iCloud) employ advanced reputation algorithms evaluating **domain authentication**, **complaint volume**, **bounce rates**, and **content patterns**.

---

## 2. Core Authentication Protocols

Every domain used for sending promotional campaigns must configure three authoritative DNS records:

### 2.1 SPF (Sender Policy Framework)
- **Record Type**: `TXT` on root domain (e.g., `example.com`)
- **Purpose**: Authorizes the IP addresses and mail servers permitted to send email on behalf of your domain.
- **Example Record**:
  ```text
  v=spf1 include:_spf.google.com include:sendinblue.com ~all
  ```
- **Best Practice**: Only publish a single SPF record per domain. Never use `+all`. Use `~all` (soft fail) or `-all` (hard fail).

### 2.2 DKIM (DomainKeys Identified Mail)
- **Record Type**: `CNAME` or `TXT` on selector subdomain (e.g., `mail._domainkey.example.com`)
- **Purpose**: Attaches a cryptographic public-key signature to outgoing email headers, proving that the email was genuinely sent by the domain owner and not altered in transit.
- **Verification**: Provided directly in your provider's sender settings (Brevo, Amazon SES, Google Workspace).

### 2.3 DMARC (Domain-based Message Authentication, Reporting, and Conformance)
- **Record Type**: `TXT` on `_dmarc.yourdomain.com`
- **Purpose**: Directs receiving mailbox providers on how to handle emails claiming to come from your domain that fail SPF or DKIM checks.
- **Example Record (Monitoring)**:
  ```text
  v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; pct=100;
  ```
- **Example Record (Enforcement)**:
  ```text
  v=DMARC1; p=quarantine; pct=100;
  ```
- **Requirement**: Since February 2024, Google and Yahoo reject unauthenticated traffic from domains without active DMARC records.

---

## 3. Google & Yahoo 2024+ Sender Mandates

All high-volume and promotional email senders must strictly comply with the following 4 rules:

1. **Keep Spam Complaints Below 0.10%**:
   - Google Postmaster Tools requires senders to maintain spam complaint rates below **0.10%** (1 spam report per 1,000 sent emails).
   - Complaint rates reaching **0.30%** trigger immediate domain-level throttling, spam folder placement, and temporary gateway rejections.
2. **Authenticate Senders (SPF + DKIM + DMARC)**:
   - Senders must not spoof `From:` headers or rely solely on provider shared domains without custom domain alignment.
3. **Provide Functional One-Click Unsubscribe**:
   - Implement RFC 8058 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` and RFC 2369 headers.
   - MailCraft includes these headers by default on every campaign.
4. **Valid Forward and Reverse DNS (rDNS / PTR)**:
   - Sending server IPs must have PTR records matching forward DNS hostnames (handled automatically when routing through Brevo or Amazon SES).

---

## 4. Bounce Management & Classifications

### 4.1 Hard Bounces (Permanent Failures)
- **Definition**: The recipient email address does not exist, the domain is expired, or the mailbox provider permanently rejected the address.
- **MailCraft Action**: Automatically places the recipient on the **Global Suppression List** and updates contact status to `suppressed`. Retries are prohibited.

### 4.2 Soft Bounces (Transient Failures)
- **Definition**: The recipient mailbox is temporarily full (`quota exceeded`), the mail server was experiencing high load (`421 4.7.0 service unavailable`), or transient network connection issues occurred.
- **MailCraft Action**: Background workers retry delivery up to 3 times with exponential backoff (e.g. 5m, 15m, 45m). If failures persist across separate campaigns, the address is flagged for review.

---

## 5. Domain & IP Warmup Strategy

When launching a new domain, IP address, or provider account:
1. **Never send 10,000 emails on Day 1**: Mailbox providers flag unexpected traffic spikes from cold domains as potential compromised accounts or spam runs.
2. **Recommended Warmup Progression**:
   - Day 1–2: 50 emails to highly engaged recent subscribers.
   - Day 3–4: 150 emails.
   - Day 5–6: 500 emails.
   - Day 7–9: 1,500 emails.
   - Day 10+: Increment volume by 20% to 30% daily while monitoring bounce and complaint rates.
3. **MailCraft Automated Rate Limiter**:
   - Background BullMQ queues throttle sending velocities according to connected provider tier:
     - Gmail: 1–2 emails/sec
     - Brevo: 5–10 emails/sec
     - Amazon SES: 14–50 emails/sec (depending on production quota)
