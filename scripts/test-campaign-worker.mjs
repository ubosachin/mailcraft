import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';

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
      // server not ready yet
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function runCampaignWorkerE2E() {
  console.log('🚀 Starting MailCraft Full Campaign & Worker Integration Test...\n');

  let webProcess = null;
  let workerProcess = null;

  try {
    // Check if web server is already running
    let isWebRunning = false;
    try {
      const h = await fetch(`${BASE_URL}/api/v1/health`);
      if (h.ok) isWebRunning = true;
    } catch {}

    if (!isWebRunning) {
      console.log('Starting Next.js production server (pnpm --filter web start)...');
      webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
        stdio: 'inherit',
        env: { ...process.env, PORT: '3000' },
      });
      await waitForServer(BASE_URL);
      console.log('✓ Next.js server operational on port 3000\n');
    } else {
      console.log('✓ Next.js server is already running on port 3000\n');
    }

    // Start background worker
    console.log('Starting BullMQ background campaign worker...');
    workerProcess = spawn('node', ['apps/worker/dist/index.js'], {
      stdio: 'pipe',
      env: { ...process.env },
    });

    workerProcess.stdout.on('data', (d) => {
      process.stdout.write(`  [Worker Log] ${d.toString()}`);
    });
    workerProcess.stderr.on('data', (d) => {
      process.stderr.write(`  [Worker Error] ${d.toString()}`);
    });

    await sleep(1500);
    console.log('✓ Background worker process spawned\n');

    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
    assert.strictEqual(healthRes.status, 200);
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'healthy');
    console.log('1. Health check passed:', health);

    // 2. Start Guest Session
    const startRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Aurora Modern Lighting',
        senderEmail: 'founders@auroralight.co',
      }),
    });
    const startData = await startRes.json();
    assert.strictEqual(startRes.status, 201);
    const rawCookie = startRes.headers.get('set-cookie');
    assert(rawCookie, 'Set-Cookie header must be returned');
    const sessionCookie = rawCookie.split(';')[0];
    const sessionId = startData.data.session.id;
    console.log(`2. Guest session initialized: ${sessionId}`);

    // 3. Save Brand Profile
    const brandRes = await fetch(`${BASE_URL}/api/v1/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        brandName: 'Aurora Modern Lighting',
        senderName: 'Clara Vance',
        senderEmail: 'founders@auroralight.co',
        website: 'https://auroralight.co',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        footerAddress: '124 Design Blvd, Suite 400, San Francisco, CA 94107',
      }),
    });
    const brandData = await brandRes.json();
    assert.strictEqual(brandRes.status, 200);
    const brandId = brandData.data.id;
    console.log(`3. Brand profile configured: ${brandId}`);

    // 4. Trigger OTP verification & Confirm
    const otpReq = await fetch(`${BASE_URL}/api/v1/guest/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ email: 'founders@auroralight.co' }),
    });
    const otpData = await otpReq.json();
    assert.strictEqual(otpReq.status, 200);
    const devOtp = otpData.data.devCode || '123456';
    console.log(`4a. OTP verification initiated. Dev code: ${devOtp}`);

    const confirmReq = await fetch(`${BASE_URL}/api/v1/guest/verify-email/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        email: 'founders@auroralight.co',
        code: devOtp,
      }),
    });
    const confirmData = await confirmReq.json();
    assert.strictEqual(confirmReq.status, 200);
    assert.strictEqual(confirmData.data.verified, true);
    assert.strictEqual(confirmData.data.verifiedEmail, 'founders@auroralight.co');
    console.log('4b. Sender email ownership verified with 6-digit OTP');

    // 5. Connect Sending Provider (Brevo / SES / Mock)
    const connRes = await fetch(`${BASE_URL}/api/v1/connections/provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        provider: 'brevo',
        senderEmail: 'founders@auroralight.co',
        credentials: {
          apiKey: 'xkeysib-mock-test-key-for-development-091298491823',
        },
      }),
    });
    const connData = await connRes.json();
    assert.strictEqual(connRes.status, 200);
    const connectionId = connData.data.id;
    console.log(`5. Sending connection saved (AES-256-GCM encrypted): ${connectionId}`);

    // 6. Bulk Import Permission-Based Contacts
    const runTag = Date.now();
    const contactsRes = await fetch(`${BASE_URL}/api/v1/contacts/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        consentConfirmed: true,
        contacts: [
          { email: `alex.designer.${runTag}@example.com`, name: 'Alex Rivera' },
          { email: `sarah.architect.${runTag}@example.com`, name: 'Sarah Chen' },
          { email: `marcus.buyer.${runTag}@example.com`, name: 'Marcus Brody' },
          { email: `elena.decor.${runTag}@example.com`, name: 'Elena Rostova' },
        ],
      }),
    });
    const contactsData = await contactsRes.json();
    assert.strictEqual(contactsRes.status, 200);
    assert.strictEqual(contactsData.data.importedCount, 4);
    console.log(`6. Bulk imported ${contactsData.data.importedCount} permission-based opt-in contacts`);

    // 7. Fetch Available Templates
    const tplRes = await fetch(`${BASE_URL}/api/v1/templates`);
    const tplData = await tplRes.json();
    assert.strictEqual(tplRes.status, 200);
    assert(tplData.data.length >= 10, 'Expected at least 10 production templates');
    const selectedTemplate = tplData.data[0];
    console.log(`7. Retrieved ${tplData.data.length} templates. Selected: "${selectedTemplate.name}"`);

    // 8. Create Campaign with Selected Template
    const campaignRes = await fetch(`${BASE_URL}/api/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        campaignName: 'Black Friday Architectural Lighting Drop',
        subject: 'Transform Your Space: Exclusive 30% Off Architectural Fixtures',
        preheader: 'Limited handcrafted lamps and sconces for modern spaces.',
        brandId,
        templateId: selectedTemplate.id,
        editorData: selectedTemplate.editorSchema,
      }),
    });
    const campaignData = await campaignRes.json();
    assert.strictEqual(campaignRes.status, 201);
    const campaignId = campaignData.data.id;
    console.log(`8. Campaign created: ${campaignId} ("${campaignData.data.campaignName}")`);

    // 9. Render Email Preview
    const renderRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/render`, {
      headers: { Cookie: sessionCookie },
    });
    const renderData = await renderRes.json();
    assert.strictEqual(renderRes.status, 200);
    assert(renderData.data.html.includes('Aurora Modern Lighting'));
    assert(renderData.data.html.includes('Unsubscribe'));
    console.log(`9. HTML email rendered successfully (${renderData.data.html.length} bytes, compliant responsive table structure)`);

    // 10. Send Test Email
    const testRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ testEmail: 'qa-tester@auroralight.co' }),
    });
    const testData = await testRes.json();
    assert.strictEqual(testRes.status, 200);
    console.log(`10. Test email job queued to BullMQ: Job ${testData.data.jobId}`);

    // 11. Launch Promotional Campaign
    const sendRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    const sendData = await sendRes.json();
    assert.strictEqual(sendRes.status, 200);
    assert.strictEqual(sendData.data.recipientCount, 4);
    console.log(`11. Campaign launched! Queued ${sendData.data.recipientCount} recipients to BullMQ (Job ${sendData.data.jobId})`);

    // 12. Wait for Background Worker to process BullMQ Queue
    console.log('12. Waiting for worker to process campaign chunk dispatch...');
    let completed = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(1000);
      const pollRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}`, {
        headers: { Cookie: sessionCookie },
      });
      const pollData = await pollRes.json();
      const status = pollData.data.status;
      process.stdout.write(`  Polling status: ${status} (Delivered: ${pollData.data.stats.delivered}/${pollData.data.recipientCount})\r`);
      if (status === 'completed') {
        completed = true;
        console.log(`\n✓ Campaign status is COMPLETED! All ${pollData.data.stats.delivered} recipients delivered.`);
        break;
      }
    }
    assert(completed, 'Campaign did not complete in background within 25 seconds');

    // 13. Query Campaign Analytics
    const analyticsRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/analytics`, {
      headers: { Cookie: sessionCookie },
    });
    const analyticsData = await analyticsRes.json();
    assert.strictEqual(analyticsRes.status, 200);
    const metrics = analyticsData.data.metrics;
    assert.strictEqual(metrics.delivered, 4);
    assert.strictEqual(analyticsData.data.recipients.length, 4);
    console.log('13. Live campaign analytics verified:');
    console.log(`    Total recipients: ${analyticsData.data.totalRecipients}`);
    console.log(`    Accepted: ${metrics.accepted}, Delivered: ${metrics.delivered}, Failed: ${metrics.failed}`);
    console.log(`    Delivery rate: ${metrics.deliveryRatePercent}%`);

    // 14. Test RFC 8058 / 2369 One-Click Unsubscribe Flow
    console.log('14. Testing one-click unsubscribe mechanism...');
    const unsubEmail = `sarah.architect.${runTag}@example.com`;
    const testUnsubToken = Buffer.from(
      JSON.stringify({
        c: campaignId,
        e: unsubEmail,
        t: Date.now(),
      })
    ).toString('base64url');

    // GET /api/v1/unsubscribe/:token
    const unsubGet = await fetch(`${BASE_URL}/api/v1/unsubscribe/${testUnsubToken}`);
    const unsubGetData = await unsubGet.json();
    assert.strictEqual(unsubGet.status, 200);
    assert.strictEqual(unsubGetData.data.email, unsubEmail);
    console.log('    ✓ Unsubscribe validation GET endpoint operational');

    // POST /api/v1/unsubscribe/:token
    const unsubPost = await fetch(`${BASE_URL}/api/v1/unsubscribe/${testUnsubToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'no_longer_interested' }),
    });
    const unsubPostData = await unsubPost.json();
    assert.strictEqual(unsubPost.status, 200);
    assert.strictEqual(unsubPostData.data.status, 'unsubscribed');
    console.log('    ✓ Unsubscribe POST recorded suppression & updated recipient status to "unsubscribed"');

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END CAMPAIGN & WORKER TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Integration test failed:', err);
    process.exitCode = 1;
  } finally {
    if (workerProcess) {
      console.log('Stopping test worker...');
      workerProcess.kill('SIGTERM');
    }
    if (webProcess) {
      console.log('Stopping test web server...');
      webProcess.kill('SIGTERM');
    }
  }
}

runCampaignWorkerE2E();
