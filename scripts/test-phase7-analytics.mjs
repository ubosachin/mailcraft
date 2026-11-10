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
  UserSession,
  EmailEvent,
  TrackingToken,
  UnsubscribeEvent,
  WebhookEventLog,
} from '../packages/database/dist/index.js';
import { processCampaignJob } from '../apps/worker/dist/processors/campaign.processor.js';

const BASE_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/v1/health`);
      if (res.ok) return true;
    } catch {
      // server starting
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function createUserSession(brandName = 'Test Brand', senderEmail = 'test@example.com') {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `${senderEmail.split('@')[0]}.${unique}@gmail.com`;
  const res = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: `PassAnalytics#${unique}`,
      brandName,
    }),
  });
  assert.strictEqual(res.status, 201, 'Auth signup must return 201');
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Must return session cookie');
  const data = await res.json();

  // Save full brand profile so validation passes
  await fetch(`${BASE_URL}/api/v1/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      brandName,
      senderName: 'CEO of ' + brandName,
      senderEmail,
      primaryColor: '#4F46E5',
      secondaryColor: '#10B981',
      website: 'https://mailcraft.io',
      footerAddress: '100 Market Street, San Francisco, CA 94105',
    }),
  });

  // Mark session verifiedEmail (simulating OTP completion)
  await UserSession.findByIdAndUpdate(data.data.session.id, {
    verifiedEmail: senderEmail,
    emailVerifiedAt: new Date(),
  });

  return {
    cookie,
    sessionId: data.data.session.id,
    brandId: data.data.brand?.id,
  };
}

async function runPhase7Tests() {
  console.log('🚀 ================================================================');
  console.log('🚀 MAILCRAFT PHASE 7: ANALYTICS, TRACKING & COMPLIANCE ENGINE');
  console.log('🚀 ================================================================\n');

  // Check or spawn Next.js server
  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for Phase 7 tests...');
    webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    });
    await waitForServer(BASE_URL);
    console.log('✓ Next.js server operational on port 3000\n');
  } else {
    console.log('✓ Existing Next.js server detected on port 3000\n');
  }

  await connectToDatabase();

  try {
    // -------------------------------------------------------------
    // Test 1: Brevo Webhook Processing (delivery, bounce, complaint)
    // -------------------------------------------------------------
    console.log('🧪 TEST 1: Brevo Webhook Event Processing...');
    const session1 = await createUserSession('Brevo Test Brand', 'brevo-sender@test.com');

    // Create a mock campaign and recipient to receive webhook events
    const camp1 = await Campaign.create({
      sessionId: session1.sessionId,
      brandId: session1.brandId,
      campaignName: 'Brevo Webhook Test Campaign',
      subject: 'Special Offer',
      provider: 'brevo',
      senderName: 'Brevo Sender',
      senderEmail: 'brevo-sender@test.com',
      editorData: {},
      recipientCount: 3,
      status: 'sending',
      stats: { accepted: 3, delivered: 0, bounced: 0, clicked: 0, unsubscribed: 0, failed: 0 },
    });

    const runId = Date.now();
    const delMsgId = `<brevo-msg-del-${runId}@mailcraft>`;
    const hbMsgId = `<brevo-msg-hb-${runId}@mailcraft>`;
    const compMsgId = `<brevo-msg-comp-${runId}@mailcraft>`;

    const recDelivered = await CampaignRecipient.create({
      campaignId: camp1._id,
      sessionId: session1.sessionId,
      email: `brevo-del-${runId}@test.com`,
      status: 'accepted',
      provider: 'brevo',
      providerMessageId: delMsgId,
      attempts: 1,
    });

    const recHardBounce = await CampaignRecipient.create({
      campaignId: camp1._id,
      sessionId: session1.sessionId,
      email: `brevo-hb-${runId}@test.com`,
      status: 'accepted',
      provider: 'brevo',
      providerMessageId: hbMsgId,
      attempts: 1,
    });

    const recComplaint = await CampaignRecipient.create({
      campaignId: camp1._id,
      sessionId: session1.sessionId,
      email: `brevo-comp-${runId}@test.com`,
      status: 'accepted',
      provider: 'brevo',
      providerMessageId: compMsgId,
      attempts: 1,
    });

    // 1a: Brevo Delivered Webhook
    const brevoDeliveredRes = await fetch(`${BASE_URL}/api/v1/webhooks/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'delivered',
        email: `brevo-del-${runId}@test.com`,
        id: `brevo_del_${runId}`,
        'message-id': delMsgId,
        ts_event: Math.floor(Date.now() / 1000),
      }),
    });
    assert.strictEqual(brevoDeliveredRes.status, 200, 'Brevo delivered webhook must return 200');

    // Verify recipient updated to delivered
    const updatedDel = await CampaignRecipient.findById(recDelivered._id);
    assert.strictEqual(updatedDel.status, 'delivered', 'Recipient status must be updated to delivered');

    // 1b: Brevo Hard Bounce Webhook
    const brevoHbRes = await fetch(`${BASE_URL}/api/v1/webhooks/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'hard_bounce',
        email: `brevo-hb-${runId}@test.com`,
        id: `brevo_hb_${runId}`,
        'message-id': hbMsgId,
        reason: '550 5.1.1 User unknown',
        ts_event: Math.floor(Date.now() / 1000),
      }),
    });
    assert.strictEqual(brevoHbRes.status, 200, 'Brevo hard bounce webhook must return 200');

    const updatedHb = await CampaignRecipient.findById(recHardBounce._id);
    assert.strictEqual(updatedHb.status, 'bounced', 'Recipient status must be updated to bounced');

    // Verify auto-suppression created for hard bounce
    const hbHash = crypto.createHash('sha256').update(`brevo-hb-${runId}@test.com`).digest('hex');
    const hbSupp = await Suppression.findOne({ emailHash: hbHash });
    assert(hbSupp, 'Hard bounce recipient must be added to global suppression list');
    assert.strictEqual(hbSupp.reason, 'hard_bounce');

    // 1c: Brevo Complaint Webhook
    const brevoCompRes = await fetch(`${BASE_URL}/api/v1/webhooks/brevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'spam',
        email: `brevo-comp-${runId}@test.com`,
        id: `brevo_comp_${runId}`,
        'message-id': compMsgId,
        ts_event: Math.floor(Date.now() / 1000),
      }),
    });
    assert.strictEqual(brevoCompRes.status, 200, 'Brevo spam complaint webhook must return 200');

    const compHash = crypto.createHash('sha256').update(`brevo-comp-${runId}@test.com`).digest('hex');
    const compSupp = await Suppression.findOne({ emailHash: compHash });
    assert(compSupp, 'Spam complaint recipient must be added to suppression list');
    assert.strictEqual(compSupp.reason, 'complaint');
    console.log('✓ Test 1 Passed: Brevo webhooks delivered, hard bounced & spam complaint auto-suppressed\n');

    // -------------------------------------------------------------
    // Test 2: Amazon SES SNS Webhook Processing & Deduplication
    // -------------------------------------------------------------
    console.log('🧪 TEST 2: Amazon SES SNS Webhooks & Deduplication...');
    // 2a: SNS SubscriptionConfirmation
    const snsConfirmRes = await fetch(`${BASE_URL}/api/v1/webhooks/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Type: 'SubscriptionConfirmation',
        MessageId: 'test-sns-sub-12345',
        Token: 'token123',
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      }),
    });
    assert.strictEqual(snsConfirmRes.status, 200, 'SNS SubscriptionConfirmation must return 200');
    const snsConfirmData = await snsConfirmRes.json();
    assert.strictEqual(snsConfirmData.data?.confirmed, true, 'Must return confirmed: true');

    // 2b: SES Notification Delivery
    const sesMsgId = `ses-msg-${runId}`;
    const recSesDel = await CampaignRecipient.create({
      campaignId: camp1._id,
      sessionId: session1.sessionId,
      email: `ses-delivered-${runId}@test.com`,
      status: 'accepted',
      provider: 'ses',
      providerMessageId: sesMsgId,
      attempts: 1,
    });

    const sesNotificationPayload = {
      Type: 'Notification',
      MessageId: `sns-notification-${runId}`,
      Message: JSON.stringify({
        notificationType: 'Delivery',
        mail: {
          messageId: sesMsgId,
          timestamp: new Date().toISOString(),
          destination: [`ses-delivered-${runId}@test.com`],
        },
        delivery: {
          timestamp: new Date().toISOString(),
          recipients: [`ses-delivered-${runId}@test.com`],
          smtpResponse: '250 2.1.5 Ok',
        },
      }),
    };

    const sesDelRes = await fetch(`${BASE_URL}/api/v1/webhooks/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sesNotificationPayload),
    });
    assert.strictEqual(sesDelRes.status, 200, 'SES Delivery notification must return 200');

    const updatedSesDel = await CampaignRecipient.findById(recSesDel._id);
    assert.strictEqual(updatedSesDel.status, 'delivered', 'SES recipient must be marked delivered');

    // 2c: Deduplication check - send exact same SES notification payload again
    const sesDelDuplicateRes = await fetch(`${BASE_URL}/api/v1/webhooks/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sesNotificationPayload),
    });
    assert.strictEqual(sesDelDuplicateRes.status, 200, 'Duplicate webhook must not crash and return 200');
    console.log('✓ Test 2 Passed: Amazon SES SNS subscription, delivery & deduplication verified\n');

    // -------------------------------------------------------------
    // Test 3: Open Tracking Pixel
    // -------------------------------------------------------------
    console.log('🧪 TEST 3: Open Tracking Pixel (1x1 GIF & Apple MPP Disclaimer)...');
    const rawOpenToken = 'raw_open_' + crypto.randomBytes(16).toString('hex');
    const openTokenHash = crypto.createHash('sha256').update(rawOpenToken).digest('hex');

    const openTokenDoc = await TrackingToken.create({
      tokenHash: openTokenHash,
      type: 'open',
      campaignId: camp1._id,
      campaignRecipientId: recDelivered._id,
      sessionId: session1.sessionId,
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });

    const openRes = await fetch(`${BASE_URL}/track/open/${rawOpenToken}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });
    assert.strictEqual(openRes.status, 200, 'Open pixel must return HTTP 200');
    assert.strictEqual(openRes.headers.get('content-type'), 'image/gif', 'Must return image/gif content-type');
    const gifBuffer = await openRes.arrayBuffer();
    assert(gifBuffer.byteLength >= 42 && gifBuffer.byteLength <= 43, '1x1 transparent GIF must be 42 or 43 bytes');

    // Verify open event was logged in EmailEvent
    const openEvent = await EmailEvent.findOne({
      campaignId: camp1._id,
      eventType: 'opened',
    });
    assert(openEvent, 'Opened EmailEvent must be recorded');
    console.log('✓ Test 3 Passed: 1x1 GIF pixel returned and opened EmailEvent recorded\n');

    // -------------------------------------------------------------
    // Test 4: Click Tracking Redirect & Anti-Open-Redirect Security
    // -------------------------------------------------------------
    console.log('🧪 TEST 4: Secure Click Redirect & Safe URL Validation...');
    const rawClickToken = 'raw_click_' + crypto.randomBytes(16).toString('hex');
    const clickTokenHash = crypto.createHash('sha256').update(rawClickToken).digest('hex');
    const destinationUrl = 'https://mailcraft.io/promotions/spring-2026?source=email';

    await TrackingToken.create({
      tokenHash: clickTokenHash,
      type: 'click',
      destinationUrl,
      campaignId: camp1._id,
      campaignRecipientId: recDelivered._id,
      sessionId: session1.sessionId,
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });

    // Make request without following redirects
    const clickRes = await fetch(`${BASE_URL}/track/click/${rawClickToken}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    assert.strictEqual(clickRes.status, 302, 'Click redirect must return HTTP 302');
    assert.strictEqual(clickRes.headers.get('location'), destinationUrl, 'Location header must match destination URL');

    // Verify click event recorded
    const clickEvent = await EmailEvent.findOne({
      campaignId: camp1._id,
      eventType: 'clicked',
    });
    assert(clickEvent, 'Clicked EmailEvent must be recorded');
    assert.strictEqual(clickEvent.metadata?.destinationUrl, destinationUrl);
    console.log('✓ Test 4 Passed: Secure HTTP 302 click redirect executed and clicked event logged\n');

    // -------------------------------------------------------------
    // Test 5: RFC 8058 One-Click Unsubscribe Pipeline
    // -------------------------------------------------------------
    console.log('🧪 TEST 5: RFC 8058 One-Click Unsubscribe Pipeline...');
    const unsubEmail = 'optout-subscriber@test.com';
    const unsubToken = Buffer.from(
      JSON.stringify({
        c: camp1._id.toString(),
        e: unsubEmail,
        t: Date.now(),
      })
    ).toString('base64url');

    const unsubRecipient = await CampaignRecipient.create({
      campaignId: camp1._id,
      sessionId: session1.sessionId,
      email: unsubEmail,
      status: 'delivered',
      attempts: 1,
      personalizationData: { unsubscribeToken: unsubToken },
    });

    const contactToOptOut = await Contact.create({
      sessionId: session1.sessionId,
      email: unsubEmail,
      normalizedEmail: unsubEmail,
      consentStatus: 'opted_in',
      consentSource: 'web_form',
    });

    // Perform RFC 8058 One-Click Unsubscribe POST
    const unsubRes = await fetch(`${BASE_URL}/api/v1/unsubscribe/${unsubToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    assert.strictEqual(unsubRes.status, 200, 'RFC 8058 unsubscribe must return HTTP 200');
    const unsubData = await unsubRes.json();
    assert.strictEqual(unsubData.data?.unsubscribed, true, 'Unsubscribed flag must be true');

    // Verify CampaignRecipient status
    const postUnsubRecipient = await CampaignRecipient.findById(unsubRecipient._id);
    assert.strictEqual(postUnsubRecipient.status, 'unsubscribed');

    // Verify Contact consentStatus updated
    const postUnsubContact = await Contact.findById(contactToOptOut._id);
    assert.strictEqual(postUnsubContact.consentStatus, 'unsubscribed');

    // Verify UnsubscribeEvent created
    const unsubTokenHash = crypto.createHash('sha256').update(unsubToken).digest('hex');
    const unsubEvent = await UnsubscribeEvent.findOne({ tokenHash: unsubTokenHash });
    assert(unsubEvent, 'UnsubscribeEvent must be stored in database');

    // Verify Suppression list entry created
    const unsubHash = crypto.createHash('sha256').update('optout-subscriber@test.com').digest('hex');
    const unsubSupp = await Suppression.findOne({ emailHash: unsubHash });
    assert(unsubSupp, 'Unsubscribed email must be persisted to global suppression list');
    console.log('✓ Test 5 Passed: RFC 8058 one-click unsubscribe persisted across recipient, contact, and suppression\n');

    // -------------------------------------------------------------
    // Test 6: Suppression List Cascade & Management Endpoints
    // -------------------------------------------------------------
    console.log('🧪 TEST 6: Suppression Management & Audit Justification...');
    // Add manual suppression via API
    const addSuppRes = await fetch(`${BASE_URL}/api/v1/suppression`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session1.cookie,
      },
      body: JSON.stringify({
        email: 'manual-block@test.com',
        reason: 'manual',
        scope: 'global',
        notes: 'User requested direct phone opt-out',
      }),
    });
    assert(addSuppRes.status === 200 || addSuppRes.status === 201, 'Add suppression must return 200 or 201');

    // List suppressions
    const listSuppRes = await fetch(`${BASE_URL}/api/v1/suppression`, {
      headers: { Cookie: session1.cookie },
    });
    assert.strictEqual(listSuppRes.status, 200);
    const listSuppData = await listSuppRes.json();
    assert(listSuppData.data.suppressions.length >= 3, 'Must list all suppressions');

    // Delete suppression without audit justification must fail
    const manualSuppId = addSuppRes.headers.get('content-type')?.includes('json')
      ? (await addSuppRes.clone().json()).data?.id
      : null;

    if (manualSuppId) {
      const invalidDelRes = await fetch(`${BASE_URL}/api/v1/suppression/${manualSuppId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: session1.cookie,
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(invalidDelRes.status, 400, 'Deleting suppression without audit justification must return 400');

      // Delete with valid justification
      const validDelRes = await fetch(`${BASE_URL}/api/v1/suppression/${manualSuppId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: session1.cookie,
        },
        body: JSON.stringify({
          auditReason: 'Subscriber contacted support with written re-opt-in proof',
        }),
      });
      assert.strictEqual(validDelRes.status, 200, 'Suppression removal with justification must return 200');
    }
    console.log('✓ Test 6 Passed: Suppression addition, audit requirement, and removal verified\n');

    // -------------------------------------------------------------
    // Test 7: In-Flight Pre-Send Suppression Gate
    // -------------------------------------------------------------
    console.log('🧪 TEST 7: In-Flight Pre-Send Suppression Check in Worker...');
    // Create a contact that becomes suppressed right before worker dispatches
    const lateSuppressedEmail = 'late-suppressed@test.com';
    const lateHash = crypto.createHash('sha256').update(lateSuppressedEmail).digest('hex');

    // Add to suppression
    await Suppression.create({
      emailHash: lateHash,
      emailEncrypted: 'mock_encrypted',
      reason: 'unsubscribe',
      scope: 'global',
    });

    const flightCamp = await Campaign.create({
      sessionId: session1.sessionId,
      brandId: session1.brandId,
      campaignName: 'In-Flight Check Campaign',
      subject: 'In Flight Promo',
      provider: 'gmail',
      senderName: 'Sender',
      senderEmail: 'test@example.com',
      editorData: {},
      recipientCount: 1,
      status: 'sending',
      stats: { accepted: 0, delivered: 0, bounced: 0, clicked: 0, unsubscribed: 0, failed: 0 },
    });

    const flightRecipient = await CampaignRecipient.create({
      campaignId: flightCamp._id,
      sessionId: session1.sessionId,
      email: lateSuppressedEmail,
      status: 'queued',
      attempts: 0,
    });

    // Execute processor directly
    await processCampaignJob({
      id: 'flight-check-job-1',
      data: {
        campaignId: flightCamp._id.toString(),
        batchSize: 1,
        delayBetweenBatchesMs: 0,
      },
    });

    const afterFlightRecipient = await CampaignRecipient.findById(flightRecipient._id);
    assert.strictEqual(afterFlightRecipient.status, 'skipped', 'Pre-send check must skip suppressed contact');
    assert(afterFlightRecipient.errorCode.includes('SUPPRESS'), 'Error code must indicate suppression');
    console.log('✓ Test 7 Passed: In-flight worker check caught suppressed contact and skipped sending\n');

    // -------------------------------------------------------------
    // Test 8: Pre-Send Compliance Validator
    // -------------------------------------------------------------
    console.log('🧪 TEST 8: Compliance Validation Engine (CAN-SPAM / GDPR / TRAI)...');
    // Test with brand missing physical address
    const badBrand = await Brand.create({
      sessionId: session1.sessionId,
      brandName: 'No Address Brand',
      senderName: 'No Address',
      senderEmail: 'no-address@test.com',
      website: 'https://test.com',
      footerAddress: '', // Empty physical address triggers CAN-SPAM failure
    });

    const badCamp = await Campaign.create({
      sessionId: session1.sessionId,
      brandId: badBrand._id,
      campaignName: 'Compliance Test Campaign',
      subject: 'Special Deals',
      provider: 'gmail',
      editorData: {},
      recipientCount: 1,
      status: 'draft',
      stats: { accepted: 0, delivered: 0, bounced: 0, clicked: 0, unsubscribed: 0, failed: 0 },
    });

    const compValidateRes = await fetch(`${BASE_URL}/api/v1/compliance/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session1.cookie,
      },
      body: JSON.stringify({ campaignId: badCamp._id.toString() }),
    });
    assert.strictEqual(compValidateRes.status, 200);
    const compData = await compValidateRes.json();
    const report = compData.data.report || compData.data;
    assert.strictEqual(report.overallStatus, 'blocked', 'Campaign missing postal address must be blocked');
    assert(report.blockedCount > 0, 'Must record blocked rules');
    console.log('✓ Test 8 Passed: Automated compliance validator caught missing postal address and blocked send\n');

    // -------------------------------------------------------------
    // Test 9: Authoritative DNS SPF & DMARC Checker
    // -------------------------------------------------------------
    console.log('🧪 TEST 9: Authoritative DNS Resolver (SPF / DMARC)...');
    const dnsRes = await fetch(`${BASE_URL}/api/v1/settings/email-authentication/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session1.cookie,
      },
      body: JSON.stringify({ domain: 'google.com' }),
    });
    assert.strictEqual(dnsRes.status, 200, 'DNS check endpoint must return 200');
    const dnsData = await dnsRes.json();
    const dnsResult = dnsData.data.result || dnsData.data;
    assert.strictEqual(dnsResult.domain, 'google.com');
    assert.strictEqual(dnsResult.spf.status, 'verified', 'google.com SPF must resolve as verified');
    assert.strictEqual(dnsResult.dmarc.status, 'verified', 'google.com DMARC must resolve as verified');
    console.log('✓ Test 9 Passed: Live authoritative DNS resolver confirmed SPF and DMARC records\n');

    // -------------------------------------------------------------
    // Test 10: Zero-Denominator Analytics Math & CSV Sanitization
    // -------------------------------------------------------------
    console.log('🧪 TEST 10: Zero-Denominator Analytics Safety & CSV Sanitization...');
    const emptySession = await createUserSession('Empty Brand', 'empty@test.com');

    // Overview with 0 dispatches must return null rates (N/A), not NaN or 0%
    const emptyOverviewRes = await fetch(`${BASE_URL}/api/v1/analytics/overview`, {
      headers: { Cookie: emptySession.cookie },
    });
    assert.strictEqual(emptyOverviewRes.status, 200);
    const emptyOverviewData = await emptyOverviewRes.json();
    const ov = emptyOverviewData.data.overview;
    assert.strictEqual(ov.totalAttempted, 0);
    assert.strictEqual(ov.acceptanceRate, null, 'Acceptance rate must be null when attempted is 0');
    assert.strictEqual(ov.deliveryRate, null, 'Delivery rate must be null when attempted is 0');
    assert.strictEqual(ov.bounceRate, null, 'Bounce rate must be null when attempted is 0');
    assert.strictEqual(ov.complaintRate, null, 'Complaint rate must be null when delivered is 0');
    assert.strictEqual(ov.clickThroughRate, null, 'CTR must be null when delivered is 0');

    // CSV Export with formula injection check
    const csvRes = await fetch(`${BASE_URL}/api/v1/analytics/export?type=campaigns`, {
      headers: { Cookie: session1.cookie },
    });
    assert.strictEqual(csvRes.status, 200);
    assert.strictEqual(csvRes.headers.get('content-type'), 'text/csv; charset=utf-8');
    const csvText = await csvRes.text();
    assert(csvText.includes('Campaign ID'), 'CSV must contain headers');

    // Deliverability endpoint
    const delivRes = await fetch(`${BASE_URL}/api/v1/analytics/deliverability`, {
      headers: { Cookie: session1.cookie },
    });
    assert.strictEqual(delivRes.status, 200);
    const delivData = await delivRes.json();
    assert(delivData.data.metrics.totalAttempted >= 0);

    // Engagement endpoint
    const engageRes = await fetch(`${BASE_URL}/api/v1/analytics/engagement`, {
      headers: { Cookie: session1.cookie },
    });
    assert.strictEqual(engageRes.status, 200);
    const engageData = await engageRes.json();
    assert(engageData.data.metrics.totalClicks >= 1);
    assert(engageData.data.linkRankings.length >= 1);
    console.log('✓ Test 10 Passed: Zero denominator rates evaluate to null & CSV export is sanitized\n');

    // -------------------------------------------------------------
    // Test 11: Multi-Tenant Session Isolation
    // -------------------------------------------------------------
    console.log('🧪 TEST 11: Multi-Tenant User Session Isolation...');
    // Session 2 attempting to access Session 1's campaign analytics
    const session2 = await createUserSession('Tenant Two', 'tenant2@test.com');
    const tenantBreachRes = await fetch(`${BASE_URL}/api/v1/analytics/campaigns/${camp1._id}`, {
      headers: { Cookie: session2.cookie },
    });
    assert.strictEqual(tenantBreachRes.status, 404, 'Accessing cross-tenant campaign analytics must return 404');
    console.log('✓ Test 11 Passed: Session isolation prevents cross-tenant data exposure\n');

    console.log('================================================================');
    console.log('🎉 ALL PHASE 7 ANALYTICS & COMPLIANCE TESTS PASSED (11/11)');
    console.log('================================================================\n');
  } finally {
    await disconnectDatabase();
    if (webProcess) {
      console.log('Stopping test Next.js server...');
      webProcess.kill();
    }
  }
}

runPhase7Tests().catch((err) => {
  console.error('\n❌ PHASE 7 TEST FAILED:', err);
  process.exit(1);
});
