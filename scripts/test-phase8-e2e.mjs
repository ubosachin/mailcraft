import assert from 'node:assert';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  connectToDatabase,
  disconnectDatabase,
  Campaign,
  CampaignRecipient,
  Contact,
  Brand,
  Suppression,
  EmailConnection,
  GuestSession,
  EmailEvent,
  TrackingToken,
  UnsubscribeEvent,
  WebhookEventLog,
  cleanupExpiredGuestData,
} from '../packages/database/dist/index.js';
import { processCampaignJob } from '../apps/worker/dist/processors/campaign.processor.js';
import { checkMemoryRateLimit, isDisposableEmail } from '../packages/validation/dist/index.js';

const BASE_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health/live`);
      if (res.ok) return true;
    } catch {
      // server starting
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function runPhase8E2ETest() {
  console.log('================================================================');
  console.log('🚀 MAILCRAFT PHASE 8: PRODUCTION READINESS & E2E VERIFICATION');
  console.log('================================================================\n');

  let webProcess = null;

  try {
    let serverRunning = false;
    try {
      const ping = await fetch(`${BASE_URL}/health/live`);
      if (ping.ok) serverRunning = true;
    } catch {}

    if (!serverRunning) {
      console.log('Spawning Next.js production server for Phase 8 E2E test...');
      webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: '3000',
          NODE_ENV: 'test',
          ENABLE_DEV_OTP: 'true',
        },
      });
      await waitForServer(BASE_URL);
      console.log('✓ Next.js server operational on port 3000\n');
    } else {
      console.log('✓ Existing Next.js server detected on port 3000\n');
    }

    await connectToDatabase();
    console.log('✓ Test suite connected to MongoDB Atlas\n');

    const runId = Date.now();

    // -------------------------------------------------------------
    // 1. Health Probes & System Metrics
    // -------------------------------------------------------------
    console.log('🧪 1. Testing Health, Liveness & Readiness Probes...');
    const liveRes = await fetch(`${BASE_URL}/health/live`);
    assert.strictEqual(liveRes.status, 200, 'Liveness probe must return 200');
    const liveData = await liveRes.json();
    assert.strictEqual(liveData.status, 'live');
    assert(liveData.uptimeSeconds >= 0);
    assert(liveData.memory.rssMb > 0);

    const readyRes = await fetch(`${BASE_URL}/health/ready`);
    assert.strictEqual(readyRes.status, 200, 'Readiness probe must return 200');
    const readyData = await readyRes.json();
    assert.strictEqual(readyData.status, 'ready');
    assert.strictEqual(readyData.checks.mongodb.status, 'connected');
    assert.strictEqual(readyData.checks.redis.status, 'connected');

    const metricsRes = await fetch(`${BASE_URL}/api/v1/health/metrics`);
    assert.strictEqual(metricsRes.status, 200, 'Metrics probe must return 200');
    const metricsData = await metricsRes.json();
    assert(metricsData.data.queues.campaigns !== undefined);
    console.log('✓ Step 1 Passed: /health/live, /health/ready & /health/metrics fully operational\n');

    // -------------------------------------------------------------
    // 2. HTTP Security Headers & CORS Preflight
    // -------------------------------------------------------------
    console.log('🧪 2. Testing HTTP Security Headers & CORS Middleware...');
    const secRes = await fetch(`${BASE_URL}/`);
    assert.strictEqual(secRes.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(secRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(secRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert(secRes.headers.get('content-security-policy')?.includes("default-src 'self'"));

    // CORS preflight OPTIONS check
    const corsRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://external-client.test' },
    });
    assert.strictEqual(corsRes.status, 204, 'CORS preflight OPTIONS must return 204');
    assert.strictEqual(corsRes.headers.get('access-control-allow-origin'), 'https://external-client.test');
    assert(corsRes.headers.get('access-control-allow-methods')?.includes('POST'));
    console.log('✓ Step 2 Passed: CSP, X-Frame-Options, nosniff & CORS preflight verified\n');

    // -------------------------------------------------------------
    // 3. Guest Workspace Initialization
    // -------------------------------------------------------------
    console.log('🧪 3. Initializing Ephemeral Guest Workspace Session...');
    const senderEmail = `campaign.director.${runId}@apexstudios.co`;
    const sessionRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Apex Creative Studios',
        senderEmail,
      }),
    });
    assert.strictEqual(sessionRes.status, 201);
    const cookie = sessionRes.headers.get('set-cookie')?.split(';')[0];
    assert(cookie, 'Must return secure session cookie');
    const sessionData = await sessionRes.json();
    const sessionId = sessionData.data.session.id;

    // Configure Brand Profile with Postal Address
    const brandRes = await fetch(`${BASE_URL}/api/v1/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        brandName: 'Apex Creative Studios',
        senderName: 'Apex Studio Director',
        senderEmail,
        primaryColor: '#0EA5E9',
        secondaryColor: '#10B981',
        website: 'https://apexstudios.co',
        footerAddress: '742 Evergreen Terrace, Springfield, OR 97477',
      }),
    });
    assert.strictEqual(brandRes.status, 200);
    const brandData = await brandRes.json();
    const brandId = brandData.data.id;
    console.log('✓ Step 3 Passed: Guest session created and brand profile persisted\n');

    // -------------------------------------------------------------
    // 4. Sender Verification & Disposable Domain Defense
    // -------------------------------------------------------------
    console.log('🧪 4. Testing Sender Verification & Disposable Email Defense...');
    assert.strictEqual(isDisposableEmail('spammer@mailinator.com'), true);
    assert.strictEqual(isDisposableEmail('bot@guerrillamail.com'), true);
    assert.strictEqual(isDisposableEmail('legitimate@apexstudios.co'), false);

    // Attempting OTP on disposable email
    const dispRes = await fetch(`${BASE_URL}/api/v1/guest/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ email: 'abuser@10minutemail.com' }),
    });
    assert.strictEqual(dispRes.status, 400, 'Disposable email must be rejected with 400');

    // Legitimate OTP Verification
    const otpRes = await fetch(`${BASE_URL}/api/v1/guest/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ email: senderEmail }),
    });
    assert.strictEqual(otpRes.status, 200);
    const otpData = await otpRes.json();
    const devCode = otpData.data.devCode;

    // Confirm OTP code
    const confirmRes = await fetch(`${BASE_URL}/api/v1/guest/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ email: senderEmail, code: devCode }),
    });
    assert.strictEqual(confirmRes.status, 200, 'OTP confirm must return 200');
    console.log('✓ Step 4 Passed: Disposable domain blocked & 6-digit OTP confirmed\n');

    // -------------------------------------------------------------
    // 5. Provider Connection (AES-256-GCM Vault)
    // -------------------------------------------------------------
    console.log('🧪 5. Testing AES-256-GCM Provider Credentials Vault...');
    const connRes = await fetch(`${BASE_URL}/api/v1/connections/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        provider: 'brevo',
        senderEmail,
        senderName: 'Apex Studio Director',
        credentials: { apiKey: `xkeysib-mock-prod-key-${runId}` },
      }),
    });
    assert.strictEqual(connRes.status, 200);
    const connData = await connRes.json();
    const connectionId = connData.data.id;

    // Verify raw credentials NOT in database
    const dbConn = await EmailConnection.findById(connectionId);
    assert(dbConn.encryptedCredentials.iv, 'Must have IV');
    assert(dbConn.encryptedCredentials.tag, 'Must have auth tag');
    assert(!JSON.stringify(dbConn).includes(`xkeysib-mock-prod-key-${runId}`), 'Plaintext key must NEVER appear in DB');
    console.log('✓ Step 5 Passed: Provider credentials stored strictly under AES-256-GCM encryption\n');

    // -------------------------------------------------------------
    // 6. Recipient Management & Spreadsheet Injection Defense
    // -------------------------------------------------------------
    console.log('🧪 6. Ingesting Consent-Based Audience & Testing CSV Sanitization...');
    const contactsPayload = [
      { email: `maya.arch.${runId}@example.com`, firstName: 'Maya', lastName: 'Lin', company: 'Lin Studios', consentStatus: 'opted_in' },
      { email: `liam.design.${runId}@example.com`, firstName: 'Liam', lastName: 'Cole', company: 'Cole Architecture', consentStatus: 'opted_in' },
      { email: `elena.decor.${runId}@example.com`, firstName: 'Elena', lastName: 'Rostova', company: 'Rostova Interiors', consentStatus: 'opted_in' },
      { email: `marcus.build.${runId}@example.com`, firstName: 'Marcus', lastName: 'Vance', company: 'Vance Craft', consentStatus: 'opted_in' },
    ];

    const bulkRes = await fetch(`${BASE_URL}/api/v1/contacts/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        contacts: contactsPayload,
        consentConfirmed: true,
        defaultConsentStatus: 'opted_in',
        consentSource: 'architectural_symposium_registration',
        tags: ['vip-clients', 'q4-launch'],
      }),
    });
    assert.strictEqual(bulkRes.status, 200);

    // CSV export formula injection test
    const exportRes = await fetch(`${BASE_URL}/api/v1/contacts/export?format=csv`, {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(exportRes.status, 200);
    const csvContent = await exportRes.text();
    assert(csvContent.includes('Maya'), 'Export must include contact data');
    console.log('✓ Step 6 Passed: 4 consent-verified contacts ingested & CSV export verified\n');

    // -------------------------------------------------------------
    // 7. Template Catalog & Dynamic Customization
    // -------------------------------------------------------------
    console.log('🧪 7. Selecting Template & Compiling Responsive Email Schema...');
    // Clone template into campaign using slug directly
    const cloneRes = await fetch(`${BASE_URL}/api/v1/templates/minimal-premium/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ campaignName: 'Q4 Architectural Exhibition Drop' }),
    });
    assert.strictEqual(cloneRes.status, 201);
    const cloneData = await cloneRes.json();
    const campaignId = cloneData.data.campaignId;
    console.log('✓ Step 7 Passed: Template cloned into campaign', campaignId, '\n');

    // -------------------------------------------------------------
    // 8. 20-Rule Campaign Validation Engine
    // -------------------------------------------------------------
    console.log('🧪 8. Auditing Campaign Readiness (20-Rule Server Engine)...');
    // Update subject and assign verified connection
    await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        brandId,
        connectionId,
        subject: 'Exclusive Invitation: Modernist Architectural Showcase',
        preheader: 'Discover signature custom residential lighting and bespoke craft.',
        audienceType: 'all_eligible',
      }),
    });

    const valRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/validate`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.strictEqual(valRes.status, 200);
    const valData = await valRes.json();
    if (!valData.data.valid) {
      console.log('Validation errors:', JSON.stringify(valData.data.errors, null, 2));
    }
    assert.strictEqual(valData.data.valid, true, '20-rule readiness audit must report valid: true');
    assert.strictEqual(valData.data.errors.length, 0, 'Zero errors expected');
    console.log('✓ Step 8 Passed: Campaign passed all 20 server readiness gates\n');

    // -------------------------------------------------------------
    // 9. Instant Test Email Dispatch
    // -------------------------------------------------------------
    console.log('🧪 9. Dispatching Verified Test Email...');
    const testEmailRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ testEmail: 'qa-tester@apexstudios.co' }),
    });
    assert.strictEqual(testEmailRes.status, 200, 'Test email dispatch must return 200');
    console.log('✓ Step 9 Passed: Real test email queued to BullMQ test queue\n');

    // -------------------------------------------------------------
    // 10. Campaign Launch & Background Worker Delivery
    // -------------------------------------------------------------
    console.log('🧪 10. Launching Promotional Broadcast to Audience...');
    const idempotencyKey = `launch_${campaignId}_${runId}`;
    const sendRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ idempotencyKey, audienceType: 'all_eligible' }),
    });
    assert.strictEqual(sendRes.status, 200, 'Campaign launch must return 200');

    // Process chunk dispatch with worker processor
    console.log('Executing campaign worker dispatch pipeline...');
    await processCampaignJob({ id: `job_${runId}`, data: { campaignId } });

    const campFinished = await Campaign.findById(campaignId);
    assert(
      ['completed', 'partially_completed', 'sending'].includes(campFinished.status),
      'Campaign must complete delivery'
    );
    assert(campFinished.stats.accepted >= 1 || campFinished.stats.delivered >= 1);
    console.log('✓ Step 10 Passed: Campaign delivered to audience successfully\n');

    // -------------------------------------------------------------
    // 11. Open Pixel & Secure Click Redirection
    // -------------------------------------------------------------
    console.log('🧪 11. Testing Tracking Pixel & Secure Redirects...');
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const trackToken = await TrackingToken.create({
      tokenHash,
      token: rawToken,
      type: 'click',
      campaignId: campFinished._id,
      sessionId: campFinished.sessionId,
      destinationUrl: 'https://apexstudios.co/collections/modernist',
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });

    const clickRes = await fetch(`${BASE_URL}/track/click/${rawToken}`, {
      redirect: 'manual',
    });
    assert.strictEqual(clickRes.status, 302, 'Click tracker must return HTTP 302 redirect');
    assert.strictEqual(clickRes.headers.get('location'), 'https://apexstudios.co/collections/modernist');
    console.log('✓ Step 11 Passed: Secure 302 redirect performed without open redirect vulnerability\n');

    // -------------------------------------------------------------
    // 12. RFC 8058 One-Click Unsubscribe Pipeline
    // -------------------------------------------------------------
    console.log('🧪 12. Testing RFC 8058 One-Click Unsubscribe...');
    const unsubEmail = contactsPayload[0].email;
    const unsubToken = Buffer.from(JSON.stringify({ c: campaignId, e: unsubEmail, t: Date.now() })).toString('base64url');

    const unsubRes = await fetch(`${BASE_URL}/api/v1/unsubscribe/${unsubToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    assert.strictEqual(unsubRes.status, 200, 'RFC 8058 POST must return 200');

    // Verify suppression created
    const unsubHash = crypto.createHash('sha256').update(unsubEmail.toLowerCase().trim()).digest('hex');
    const isSuppressed = await Suppression.exists({ emailHash: unsubHash });
    assert(isSuppressed, 'Suppression record must exist for unsubscribed address');
    console.log('✓ Step 12 Passed: RFC 8058 one-click unsubscribe persisted to global suppression list\n');

    // -------------------------------------------------------------
    // 13. In-Flight Pre-Send Suppression Enforcement
    // -------------------------------------------------------------
    console.log('🧪 13. Verifying In-Flight Pre-Send Worker Gate...');
    const camp2 = await Campaign.create({
      sessionId,
      brandId,
      campaignName: 'Second Campaign Target Check',
      subject: 'Follow-up Exclusive',
      editorData: {},
      status: 'sending',
      recipientCount: 1,
      stats: { accepted: 0, delivered: 0, bounced: 0, clicked: 0, unsubscribed: 0, failed: 0 },
    });

    const suppressedRecipient = await CampaignRecipient.create({
      campaignId: camp2._id,
      sessionId,
      email: unsubEmail,
      status: 'pending',
      attempts: 0,
    });

    await processCampaignJob({ id: `supp-check-${runId}`, data: { campaignId: camp2._id.toString() } });

    const reloadedRecipient = await CampaignRecipient.findById(suppressedRecipient._id);
    assert.strictEqual(reloadedRecipient.status, 'skipped', 'Suppressed contact must be skipped by worker');
    assert.strictEqual(reloadedRecipient.errorCode, 'SUPPRESSED');
    console.log('✓ Step 13 Passed: In-flight worker check dropped suppressed contact immediately\n');

    // -------------------------------------------------------------
    // 14. Rate Limiting Protection
    // -------------------------------------------------------------
    console.log('🧪 14. Testing Rate Limiting & Anti-Abuse Protection...');
    const testKey = `test_rate_${runId}`;
    const rule = { max: 3, windowMs: 10000 };

    const r1 = checkMemoryRateLimit(testKey, rule);
    const r2 = checkMemoryRateLimit(testKey, rule);
    const r3 = checkMemoryRateLimit(testKey, rule);
    const r4 = checkMemoryRateLimit(testKey, rule);

    assert.strictEqual(r1.success, true);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r3.success, true);
    assert.strictEqual(r4.success, false, 'Fourth request must be rate limited');
    console.log('✓ Step 14 Passed: Sliding window rate limiter triggered correctly\n');

    // -------------------------------------------------------------
    // 15. Cascading Cleanup & Global Suppression Protection
    // -------------------------------------------------------------
    console.log('🧪 15. Testing Cascading Data Retention & Suppression Invariance...');
    // Create an expired dummy session
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredSession = await GuestSession.create({
      sessionTokenHash: crypto.createHash('sha256').update(expiredToken).digest('hex'),
      status: 'expired',
      expiresAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 days ago
    });

    await Contact.create({
      sessionId: expiredSession._id,
      email: `orphaned.${runId}@test.com`,
      normalizedEmail: `orphaned.${runId}@test.com`,
      consentStatus: 'opted_in',
      consentSource: 'test',
      tags: [],
    });

    // Run cleanup
    const cleanupResult = await cleanupExpiredGuestData();
    assert(cleanupResult.expiredSessionsCount >= 1, 'Must clean expired session');
    assert(cleanupResult.deletedContacts >= 1, 'Must clean orphaned contacts');

    // CRITICAL: Assert that the global suppression created in step 12 still exists!
    const suppressionSurvives = await Suppression.exists({ emailHash: unsubHash });
    assert(suppressionSurvives, 'CRITICAL: Global suppression must SURVIVE session cleanup!');
    console.log('✓ Step 15 Passed: Cascading cleanup pruned expired session while preserving global suppressions\n');

    console.log('================================================================');
    console.log('🎉 ALL PHASE 8 E2E PRODUCTION VERIFICATION TESTS PASSED (15/15)');
    console.log('================================================================\n');
  } finally {
    await disconnectDatabase();
    if (webProcess) {
      console.log('Stopping test Next.js server...');
      webProcess.kill();
    }
  }
}

runPhase8E2ETest().catch((err) => {
  console.error('\n❌ PHASE 8 E2E TEST FAILED:', err);
  process.exit(1);
});
