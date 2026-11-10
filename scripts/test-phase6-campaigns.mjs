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
      password: `PassCampaign#${unique}`,
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

async function runPhase6Tests() {
  console.log('🚀 ================================================================');
  console.log('🚀 MAILCRAFT PHASE 6: CAMPAIGN MANAGEMENT & BULK SENDING ENGINE');
  console.log('🚀 ================================================================\n');

  // Check or spawn Next.js server
  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for Phase 6 tests...');
    webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    });
    await waitForServer(BASE_URL);
    console.log('✓ Next.js server operational on port 3000\n');
  } else {
    console.log('✓ Next.js server already running on port 3000\n');
  }

  await connectToDatabase();

  const userA = await createUserSession('Acme Marketing Corp', 'alex@acmemarketing.com');
  const userB = await createUserSession('Beta Industries', 'ben@betaindustries.com');

  console.log('✓ User test sessions established:');
  console.log(`  - User A: ${userA.sessionId}`);
  console.log(`  - User B: ${userB.sessionId}\n`);

  // Verify brand A ID
  const brandDoc = await Brand.findOne({ sessionId: userA.sessionId });
  assert(brandDoc, 'Brand A must exist in database');
  const brandAId = brandDoc._id.toString();

  // --------------------------------------------------------------------------
  // TEST 1: CAMPAIGN CRUD & LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Campaign CRUD & Initial State Machine ---');

  const createCampRes = await fetch(`${BASE_URL}/api/v1/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      campaignName: 'Black Friday Super Promo',
      description: 'Exclusive 40% discount for our opted-in subscribers',
      brandId: brandAId,
      subject: 'Massive Savings Inside, {{first_name}}!',
      preheader: 'Limited stock. Shop today.',
      audienceType: 'all_eligible',
      editorData: {
        settings: { background: '#FFFFFF', contentWidth: 600, fontFamily: 'sans-serif' },
        blocks: [
          {
            id: 'b1',
            type: 'text',
            content: { text: 'Hello {{first_name}}, check our discounts for {{brand_name}}!' },
          },
          {
            id: 'b2',
            type: 'button',
            content: { text: 'Claim Offer', url: 'https://mailcraft.io/deal' },
          },
          {
            id: 'b3',
            type: 'footer',
            content: { text: 'Unsubscribe at {{unsubscribe_url}}' },
          },
        ],
      },
    }),
  });

  assert.strictEqual(createCampRes.status, 201, 'Create campaign must return 201');
  const campData = await createCampRes.json();
  assert.strictEqual(campData.success, true);
  const campaign1Id = campData.data.id;
  assert.strictEqual(campData.data.status, 'draft', 'Initial campaign status must be draft');
  console.log(`✓ Campaign created in 'draft' state: ${campaign1Id}`);

  // Update campaign
  const updateCampRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      subject: 'Updated: 50% Off Everything Today!',
      preheader: 'Ends tonight at midnight.',
    }),
  });
  assert.strictEqual(updateCampRes.status, 200, 'Update campaign must return 200');
  const updatedData = await updateCampRes.json();
  assert.strictEqual(updatedData.data.subject, 'Updated: 50% Off Everything Today!');
  console.log('✓ Campaign patched with updated subject and preheader');

  // List campaigns
  const listCampRes = await fetch(`${BASE_URL}/api/v1/campaigns?status=draft`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(listCampRes.status, 200);
  const listData = await listCampRes.json();
  assert(listData.data.campaigns.length >= 1, 'Should list at least 1 draft campaign');
  assert.strictEqual(listData.data.campaigns[0].id, campaign1Id);
  console.log('✓ Campaign listing and status filtering verified\n');

  // --------------------------------------------------------------------------
  // TEST 2: 20-RULE SERVER VALIDATION ENGINE
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: 20-Rule Server Validation Engine ---');

  // Create an invalid campaign without blocks and no recipients
  const invalidCamp = await Campaign.create({
    sessionId: userA.sessionId,
    brandId: brandAId,
    campaignName: 'X', // too short (<2)
    subject: 'A', // too short (<2)
    status: 'draft',
    editorData: { blocks: [] },
  });

  const validateInvalidRes = await fetch(
    `${BASE_URL}/api/v1/campaigns/${invalidCamp._id}/validate`,
    {
      method: 'POST',
      headers: { Cookie: userA.cookie },
    }
  );
  assert.strictEqual(validateInvalidRes.status, 200);
  const invalidValidation = await validateInvalidRes.json();
  assert.strictEqual(invalidValidation.data.valid, false, 'Invalid campaign must fail validation');
  assert(
    invalidValidation.data.errors.some((e) => e.code === 'INVALID_SUBJECT'),
    'Must catch INVALID_SUBJECT'
  );
  assert(
    invalidValidation.data.errors.some((e) => e.code === 'EMPTY_AUDIENCE'),
    'Must catch EMPTY_AUDIENCE'
  );
  assert(
    invalidValidation.data.errors.some((e) => e.code === 'EMPTY_TEMPLATE'),
    'Must catch EMPTY_TEMPLATE'
  );
  console.log(
    `✓ Server validation engine blocked invalid campaign with ${invalidValidation.data.errors.length} detected errors`
  );

  // Now seed 3 opted-in contacts for User A
  await Contact.create([
    {
      sessionId: userA.sessionId,
      email: 'carol@example.com',
      normalizedEmail: 'carol@example.com',
      firstName: 'Carol',
      lastName: 'Danvers',
      consentStatus: 'opted_in',
      consentSource: 'web_form',
    },
    {
      sessionId: userA.sessionId,
      email: 'david@example.com',
      normalizedEmail: 'david@example.com',
      firstName: 'David',
      lastName: 'Miller',
      consentStatus: 'opted_in',
      consentSource: 'checkout',
    },
    {
      sessionId: userA.sessionId,
      email: 'emma@example.com',
      normalizedEmail: 'emma@example.com',
      firstName: 'Emma',
      lastName: 'Watson',
      consentStatus: 'opted_in',
      consentSource: 'web_form',
    },
    {
      sessionId: userA.sessionId,
      email: 'frank-suppressed@example.com',
      normalizedEmail: 'frank-suppressed@example.com',
      firstName: 'Frank',
      consentStatus: 'unsubscribed',
      consentSource: 'web_form',
    },
  ]);

  // Validate campaign 1 (which has subject and blocks with footer & eligible contacts)
  const validateCamp1Res = await fetch(
    `${BASE_URL}/api/v1/campaigns/${campaign1Id}/validate`,
    {
      method: 'POST',
      headers: { Cookie: userA.cookie },
    }
  );
  const camp1Validation = await validateCamp1Res.json();
  assert.strictEqual(camp1Validation.data.valid, true, 'Campaign 1 must pass all 20 rules');
  assert.strictEqual(camp1Validation.data.errors.length, 0, 'Zero errors expected');
  console.log('✓ Campaign 1 passed 100% of readiness rules (Valid: true)\n');

  // --------------------------------------------------------------------------
  // TEST 3: AUDIENCE RESOLUTION & CONTENT SNAPSHOTTING
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Audience Resolution & Content Snapshotting ---');

  const idempotencyKey1 = crypto.randomUUID();
  const sendRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      audienceType: 'all_eligible',
      idempotencyKey: idempotencyKey1,
    }),
  });

  assert.strictEqual(sendRes.status, 200, 'Launch campaign must return 200');
  const sendData = await sendRes.json();
  assert.strictEqual(sendData.success, true);
  assert.strictEqual(sendData.data.status, 'queued');
  assert.strictEqual(sendData.data.recipientCount, 3, 'Must resolve exactly 3 opted-in contacts');

  // Verify frozen snapshot in database
  const sentCampDoc = await Campaign.findById(campaign1Id);
  assert(sentCampDoc.snapshot, 'Frozen snapshot must exist');
  assert(sentCampDoc.snapshot.renderedHtml, 'Snapshot must contain renderedHtml');
  assert(sentCampDoc.snapshot.subject, 'Snapshot must contain subject');
  assert(sentCampDoc.snapshot.snapshotAt, 'Snapshot snapshotAt must be set');
  console.log('✓ Content snapshot frozen at launch time in campaign record');

  // Verify campaign recipients populated
  const recipientsCount = await CampaignRecipient.countDocuments({ campaignId: campaign1Id });
  assert.strictEqual(recipientsCount, 3, 'Exactly 3 opted-in recipients should be queued');

  // Verify suppressed email was excluded
  const suppressedRecipient = await CampaignRecipient.findOne({
    campaignId: campaign1Id,
    email: 'frank-suppressed@example.com',
  });
  assert.strictEqual(suppressedRecipient, null, 'Suppressed contact must NOT be queued');
  console.log('✓ Audience resolution strictly excluded suppressed/unsubscribed contacts\n');

  // --------------------------------------------------------------------------
  // TEST 4: TEST EMAIL DISPATCH
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Test Email Dispatch & Verification ---');

  const testEmailRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      testEmail: 'qa-tester@mailcraft.io',
    }),
  });
  assert.strictEqual(testEmailRes.status, 200, 'Test email must return 200');
  const testEmailData = await testEmailRes.json();
  assert(testEmailData.data.jobId, 'Must return queued BullMQ test jobId');
  assert.strictEqual(testEmailData.data.testEmail, 'qa-tester@mailcraft.io');

  // Confirm campaign recipient list was untouched
  const recipientsAfterTest = await CampaignRecipient.countDocuments({ campaignId: campaign1Id });
  assert.strictEqual(recipientsAfterTest, 3, 'Test email must not alter campaign recipient list');
  console.log('✓ Test email dispatched cleanly without polluting campaign audience\n');

  // --------------------------------------------------------------------------
  // TEST 5: LAUNCH IDEMPOTENCY KEY GATE
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Launch Idempotency Key Gate ---');

  const duplicateSendRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      idempotencyKey: idempotencyKey1,
    }),
  });
  assert.strictEqual(duplicateSendRes.status, 200, 'Duplicate send with same key must return 200');
  const dupData = await duplicateSendRes.json();
  assert(
    dupData.data.message.includes('already been queued'),
    'Must indicate idempotent response'
  );

  const recipientsAfterDup = await CampaignRecipient.countDocuments({ campaignId: campaign1Id });
  assert.strictEqual(recipientsAfterDup, 3, 'Idempotency prevented duplicate recipient insertions');
  console.log('✓ Idempotency gate successfully protected campaign against double dispatch\n');

  // --------------------------------------------------------------------------
  // TEST 6: BULLMQ WORKER PROCESSING & LIVE PROGRESS
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Worker Execution & Live Progress Tracking ---');

  // Process campaign via worker processor
  const mockJob = {
    id: 'test-job-1',
    data: { campaignId: campaign1Id, batchSize: 10 },
  };
  await processCampaignJob(mockJob);

  // Check progress API
  const progressRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}/progress`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(progressRes.status, 200);
  const progressData = await progressRes.json();
  assert.strictEqual(progressData.data.status, 'completed', 'Status should transition to completed');
  assert.strictEqual(progressData.data.percentage, 100, 'Progress should be 100%');
  assert.strictEqual(progressData.data.delivered, 3, 'All 3 should be marked delivered');
  assert.strictEqual(progressData.data.queued, 0);
  console.log(
    `✓ Batch delivery completed: 3/3 delivered (100% progress) recorded in live progress API\n`
  );

  // --------------------------------------------------------------------------
  // TEST 7: PERSONALIZATION VARIABLE INTERPOLATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Personalization Variable Interpolation ---');

  const carolRecipient = await CampaignRecipient.findOne({
    campaignId: campaign1Id,
    email: 'carol@example.com',
  });
  assert(carolRecipient, 'Carol recipient record must exist');
  assert.strictEqual(carolRecipient.status, 'delivered');
  assert.strictEqual(
    carolRecipient.personalizationData.firstName || carolRecipient.personalizationData.first_name,
    'Carol'
  );
  assert.strictEqual(
    carolRecipient.personalizationData.lastName || carolRecipient.personalizationData.last_name,
    'Danvers'
  );
  console.log('✓ Personalization data accurately mapped into recipient records\n');

  // --------------------------------------------------------------------------
  // TEST 8: REAL-TIME SUPPRESSION CHECK DURING DELIVERY
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Real-Time Suppression Check Prior to Dispatch ---');

  // Create campaign 2
  const camp2 = await Campaign.create({
    sessionId: userA.sessionId,
    brandId: brandAId,
    campaignName: 'Flash Promo With Late Suppression',
    subject: 'Flash Deal!',
    status: 'draft',
    editorData: {
      settings: { background: '#FFF', contentWidth: 600, fontFamily: 'sans-serif' },
      blocks: [
        { id: 'b1', type: 'text', content: { text: 'Deal text {{unsubscribe_url}}' } },
        { id: 'b2', type: 'footer', content: { text: '100 Market St, San Francisco' } },
      ],
    },
  });

  // Launch campaign 2
  await fetch(`${BASE_URL}/api/v1/campaigns/${camp2._id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ audienceType: 'all_eligible' }),
  });

  // Now, BEFORE worker runs, dynamically add david@example.com to Suppression collection
  const davidLower = 'david@example.com'.toLowerCase().trim();
  const davidHash = crypto.createHash('sha256').update(davidLower).digest('hex');
  await Suppression.create({
    emailHash: davidHash,
    emailEncrypted: 'mock-encrypted-david',
    reason: 'complaint',
    scope: 'session',
    sessionId: userA.sessionId,
  });

  // Run worker for campaign 2
  await processCampaignJob({
    id: 'test-job-2',
    data: { campaignId: camp2._id.toString(), batchSize: 10 },
  });

  // Verify that david was skipped because of real-time suppression check
  const davidRecipient = await CampaignRecipient.findOne({
    campaignId: camp2._id,
    email: 'david@example.com',
  });
  assert(davidRecipient, 'David recipient record must exist');
  assert.strictEqual(davidRecipient.status, 'skipped', 'Must be marked skipped');
  assert.strictEqual(davidRecipient.lastErrorCode, 'SUPPRESSED');

  // Verify carol was delivered
  const carolRecipient2 = await CampaignRecipient.findOne({
    campaignId: camp2._id,
    email: 'carol@example.com',
  });
  assert.strictEqual(carolRecipient2.status, 'delivered');
  console.log('✓ Real-time suppression check caught suppressed contact immediately before send\n');

  // --------------------------------------------------------------------------
  // TEST 9: PAUSE AND RESUME LIFECYCLE CONTROLS
  // --------------------------------------------------------------------------
  console.log('--- TEST 9: Pause and Resume Controls ---');

  const camp3 = await Campaign.create({
    sessionId: userA.sessionId,
    brandId: brandAId,
    campaignName: 'Pause Test Campaign',
    subject: 'Pause Subject',
    status: 'sending',
  });

  // Pause
  const pauseRes = await fetch(`${BASE_URL}/api/v1/campaigns/${camp3._id}/pause`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(pauseRes.status, 200);
  const pauseData = await pauseRes.json();
  assert.strictEqual(pauseData.data.status, 'paused');

  const pausedDoc = await Campaign.findById(camp3._id);
  assert.strictEqual(pausedDoc.status, 'paused');
  assert(pausedDoc.pausedAt, 'pausedAt must be recorded');
  console.log('✓ Campaign successfully paused via POST /pause');

  // Resume
  const resumeRes = await fetch(`${BASE_URL}/api/v1/campaigns/${camp3._id}/resume`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(resumeRes.status, 200);
  const resumeData = await resumeRes.json();
  assert.strictEqual(resumeData.data.status, 'queued');

  const resumedDoc = await Campaign.findById(camp3._id);
  assert.strictEqual(resumedDoc.status, 'queued');
  console.log('✓ Campaign successfully resumed via POST /resume\n');

  // --------------------------------------------------------------------------
  // TEST 10: CAMPAIGN CANCELLATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: Campaign Cancellation ---');

  const cancelRes = await fetch(`${BASE_URL}/api/v1/campaigns/${camp3._id}/cancel`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(cancelRes.status, 200);
  const cancelData = await cancelRes.json();
  assert.strictEqual(cancelData.data.status, 'cancelled');

  const cancelledDoc = await Campaign.findById(camp3._id);
  assert.strictEqual(cancelledDoc.status, 'cancelled');
  assert(cancelledDoc.cancelledAt, 'cancelledAt must be recorded');
  console.log('✓ Campaign successfully cancelled with timestamp\n');

  // --------------------------------------------------------------------------
  // TEST 11: CAMPAIGN SCHEDULING
  // --------------------------------------------------------------------------
  console.log('--- TEST 11: Campaign Scheduling & Future Timestamp ---');

  const camp4 = await Campaign.create({
    sessionId: userA.sessionId,
    brandId: brandAId,
    campaignName: 'Scheduled Promo Campaign',
    subject: 'Scheduled Subject',
    status: 'draft',
    editorData: {
      settings: { background: '#FFF', contentWidth: 600, fontFamily: 'sans-serif' },
      blocks: [
        { id: 'b1', type: 'text', content: { text: 'Deal text {{unsubscribe_url}}' } },
        { id: 'b2', type: 'footer', content: { text: '100 Market St, San Francisco' } },
      ],
    },
  });

  const futureTime = new Date(Date.now() + 3600000); // 1 hour in future
  const schedRes = await fetch(`${BASE_URL}/api/v1/campaigns/${camp4._id}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      scheduledAt: futureTime.toISOString(),
      timezone: 'UTC',
    }),
  });

  assert.strictEqual(schedRes.status, 200);
  const schedData = await schedRes.json();
  assert.strictEqual(schedData.data.status, 'scheduled');
  assert(schedData.data.jobId, 'Delayed BullMQ job should be registered');

  const schedDoc = await Campaign.findById(camp4._id);
  assert.strictEqual(schedDoc.status, 'scheduled');
  assert(schedDoc.scheduledAt, 'scheduledAt must be saved');
  console.log('✓ Campaign successfully scheduled with delayed BullMQ job\n');

  // --------------------------------------------------------------------------
  // TEST 12: DUPLICATION, REPORT EXPORT & MULTI-TENANT ISOLATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 12: Duplication, Report Export & Tenant Isolation ---');

  // Duplicate campaign 1
  const dupRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}/duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({}),
  });
  assert.strictEqual(dupRes.status, 201);
  const duplicated = await dupRes.json();
  assert.strictEqual(duplicated.data.status, 'draft');
  assert(duplicated.data.campaignName.includes('(Copy)'));
  const dupDoc = await Campaign.findById(duplicated.data.id);
  assert.strictEqual(dupDoc.recipientCount, 0, 'Cloned campaign must have 0 recipients');
  console.log('✓ Campaign duplicated into clean fresh draft');

  // Export failure report CSV
  const reportRes = await fetch(`${BASE_URL}/api/v1/campaigns/${camp2._id}/report?format=csv`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(reportRes.status, 200);
  assert(reportRes.headers.get('content-type')?.includes('text/csv'));
  const csvText = await reportRes.text();
  assert(csvText.includes('Email,Status,Error Code,Error Message'));
  assert(csvText.includes('david@example.com'));
  console.log('✓ Sanitized CSV failure report export verified');

  // Multi-tenant isolation checks: User B attempts to access User A's campaign
  const userBGetRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}`, {
    headers: { Cookie: userB.cookie },
  });
  assert.strictEqual(userBGetRes.status, 404, 'User B must not view User A campaign (404)');

  const userBPatchRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
    },
    body: JSON.stringify({ subject: 'Hacked Subject' }),
  });
  assert.strictEqual(userBPatchRes.status, 404, 'User B must not modify User A campaign (404)');

  const userBDeleteRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign1Id}`, {
    method: 'DELETE',
    headers: { Cookie: userB.cookie },
  });
  assert.strictEqual(userBDeleteRes.status, 404, 'User B must not delete User A campaign (404)');
  console.log('✓ Strict multi-tenant session isolation verified across all endpoints\n');

  console.log('🎉 ================================================================');
  console.log('🎉 ALL 12 CAMPAIGN MANAGEMENT & BULK ENGINE TESTS PASSED PERFECTLY!');
  console.log('🎉 ================================================================\n');

  if (webProcess) {
    webProcess.kill();
  }
  await disconnectDatabase();
}

runPhase6Tests().catch(async (err) => {
  console.error('❌ Phase 6 Test Suite Failed:', err);
  try {
    await disconnectDatabase();
  } catch {}
  process.exit(1);
});
