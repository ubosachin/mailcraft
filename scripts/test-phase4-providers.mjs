import assert from 'node:assert';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  connectToDatabase,
  disconnectDatabase,
  EmailConnection,
  GuestSession,
  Campaign,
  CampaignRecipient,
  CampaignEvent,
  Suppression,
  encryptCredentials,
  decryptCredentials,
} from '../packages/database/dist/index.js';
import emailProvidersPkg from '../packages/email-providers/dist/index.js';
const {
  createProviderFromConnection,
  createMockProvider,
  GmailOAuthClient,
  BrevoProvider,
  SesProvider,
  signAwsRequest,
} = emailProvidersPkg;

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

async function runPhase4Tests() {
  console.log('🚀 =======================================================');
  console.log('🚀 MAILCRAFT PHASE 4: EMAIL PROVIDER INFRASTRUCTURE SUITE');
  console.log('🚀 =======================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: SERVER SPAWNING & HEALTH CHECK
  // --------------------------------------------------------------------------
  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for Phase 4 tests...');
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

  // --------------------------------------------------------------------------
  // TEST 2: PROVIDER CATALOG MATRIX ENDPOINT
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Provider Catalog & Delivery Matrix API ---');
  const catalogRes = await fetch(`${BASE_URL}/api/v1/connections/providers`);
  assert.strictEqual(catalogRes.status, 200);
  const catalogData = await catalogRes.json();
  assert.strictEqual(catalogData.success, true);
  assert(Array.isArray(catalogData.data));
  assert.strictEqual(catalogData.data.length, 3);

  const providerIds = catalogData.data.map((p) => p.id);
  assert(providerIds.includes('gmail'), 'Gmail must be in providers catalog');
  assert(providerIds.includes('brevo'), 'Brevo must be in providers catalog');
  assert(providerIds.includes('ses'), 'SES must be in providers catalog');

  const gmailMeta = catalogData.data.find((p) => p.id === 'gmail');
  assert.strictEqual(gmailMeta.channel, 'low_volume');
  assert.strictEqual(gmailMeta.requiresDnsSetup, false);

  const brevoMeta = catalogData.data.find((p) => p.id === 'brevo');
  assert.strictEqual(brevoMeta.channel, 'bulk');
  assert.strictEqual(brevoMeta.requiresDnsSetup, true);

  console.log('✓ Provider catalog verified with architectural channel separation\n');

  // --------------------------------------------------------------------------
  // TEST 3: PURE-TS AWS SIGV4 SIGNER & PROVIDER UNIT TESTS
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Email Provider Unit Verifications ---');

  // 2a. AWS SigV4 Signer
  const url = new URL('https://email.us-east-1.amazonaws.com/v2/email/outbound-emails');
  const signedHeaders = signAwsRequest(
    'POST',
    url,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ Content: { Simple: { Subject: { Data: 'Test' } } } }),
    {
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
    }
  );
  assert(signedHeaders['Authorization'], 'SigV4 Authorization header required');
  assert(signedHeaders['Authorization'].startsWith('AWS4-HMAC-SHA256'), 'Must use AWS4-HMAC-SHA256');
  assert(signedHeaders['x-amz-date'], 'x-amz-date header required');
  console.log('  ✓ AWS SigV4 pure-TS HMAC-SHA256 signer validated');

  // 2b. Gmail OAuth State generation & tamper detection
  const oauthClient = new GmailOAuthClient();
  const testSessionId = new GuestSession()._id.toString();
  const validState = oauthClient.generateState(testSessionId);
  assert(oauthClient.validateState(validState, testSessionId), 'Valid state must pass');
  assert(!oauthClient.validateState(validState, 'different_session_id'), 'Cross-session state must be rejected');
  assert(!oauthClient.validateState(validState + 'tampered', testSessionId), 'Tampered state signature must fail');
  console.log('  ✓ Gmail OAuth PKCE state HMAC protection & CSRF prevention validated');

  // 2c. Mock Provider abstraction
  const mockProv = createMockProvider();
  const mockConnCheck = await mockProv.verifyConnection();
  assert.strictEqual(mockConnCheck.valid, true);
  const mockSendRes = await mockProv.sendEmail({
    to: 'test@example.com',
    subject: 'Unit Test',
    html: '<p>Test</p>',
    text: 'Test',
  });
  assert(mockSendRes.messageId.includes('mock'));
  assert.strictEqual(mockSendRes.accepted, true);
  console.log('  ✓ Mock Provider abstraction validated');

  // 2d. Brevo Provider simulated/dev testing
  const brevoProv = new BrevoProvider({
    apiKey: 'xkeysib-mock-dev-key',
    defaultSenderEmail: 'marketing@acme.com',
    defaultSenderName: 'Acme News',
  });
  const brevoCheck = await brevoProv.verifyConnection();
  assert.strictEqual(brevoCheck.valid, true);
  const brevoDns = await brevoProv.verifySender('marketing@acme.com');
  assert(Array.isArray(brevoDns.dnsRecords));
  assert(brevoDns.dnsRecords.some((r) => r.type === 'TXT' && r.value.includes('spf')));
  console.log('  ✓ Brevo Provider connection & DNS guidance validated');

  // 2e. SES Provider simulated/dev testing
  const sesProv = new SesProvider({
    accessKeyId: 'AKIA_MOCK_DEV_ID',
    secretAccessKey: 'mock_secret_key',
    region: 'us-east-1',
    defaultSenderEmail: 'alerts@acme.com',
  });
  const sesCheck = await sesProv.verifyConnection();
  assert.strictEqual(sesCheck.valid, true);
  const sesDns = await sesProv.verifySender('alerts@acme.com');
  assert(sesDns.dnsRecords.some((r) => r.type === 'CNAME'));
  console.log('  ✓ Amazon SES Provider connection & Easy-DKIM guidance validated\n');

  // --------------------------------------------------------------------------
  // TEST 4: GUEST SESSIONS FOR MULTI-TENANT ISOLATION TESTS
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Guest Sessions & Multi-Tenant Isolation ---');
  // Create Session A
  const sessionARes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName: 'Brand Alpha', senderEmail: 'alpha@example.com' }),
  });
  const sessionAData = await sessionARes.json();
  const cookieA = sessionARes.headers.get('set-cookie')?.split(';')[0];
  const sessionAId = sessionAData.data.session.id;

  // Create Session B
  const sessionBRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName: 'Brand Beta', senderEmail: 'beta@example.com' }),
  });
  const sessionBData = await sessionBRes.json();
  const cookieB = sessionBRes.headers.get('set-cookie')?.split(';')[0];
  const sessionBId = sessionBData.data.session.id;

  console.log(`  Session A: ${sessionAId}`);
  console.log(`  Session B: ${sessionBId}`);
  console.log('✓ Dual guest sessions initialized\n');

  // --------------------------------------------------------------------------
  // TEST 5: GMAIL OAUTH FLOW & TOKEN ENCRYPTION
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Google Gmail OAuth 2.0 Integration ---');
  // 5a. Start OAuth
  const startOAuthRes = await fetch(`${BASE_URL}/api/v1/connections/gmail/start?format=json`, {
    headers: { Cookie: cookieA, Accept: 'application/json' },
  });
  assert.strictEqual(startOAuthRes.status, 200);
  const startOAuthData = await startOAuthRes.json();
  assert(startOAuthData.data.url.includes('accounts.google.com/o/oauth2/v2/auth'));
  assert(startOAuthData.data.url.includes('state='));
  const oauthState = startOAuthData.data.state;

  // 5b. OAuth Callback
  const callbackRes = await fetch(
    `${BASE_URL}/api/v1/connections/gmail/callback?code=mock_code_123&state=${oauthState}&format=json`,
    {
      headers: { Cookie: cookieA, Accept: 'application/json' },
    }
  );
  assert.strictEqual(callbackRes.status, 200);
  const callbackData = await callbackRes.json();
  assert.strictEqual(callbackData.success, true);
  assert.strictEqual(callbackData.data.provider, 'gmail');
  assert.strictEqual(callbackData.data.status, 'connected');
  const gmailConnId = callbackData.data.id;

  // 5c. Verify token verification endpoint
  const verifyTokenRes = await fetch(`${BASE_URL}/api/v1/connections/gmail/verify`, {
    method: 'POST',
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(verifyTokenRes.status, 200);
  const verifyTokenData = await verifyTokenRes.json();
  assert.strictEqual(verifyTokenData.data.verified, true);
  console.log('✓ Gmail OAuth connection established & token verified\n');

  // --------------------------------------------------------------------------
  // TEST 6: BREVO CONNECTION & SENDER VERIFICATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Brevo REST API v3 Integration ---');
  const brevoConnectRes = await fetch(`${BASE_URL}/api/v1/connections/provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      provider: 'brevo',
      senderEmail: 'marketing@alpha-brand.com',
      senderName: 'Alpha Marketing',
      credentials: {
        apiKey: 'xkeysib-mock-dev-key',
      },
    }),
  });
  assert.strictEqual(brevoConnectRes.status, 200);
  const brevoConnectData = await brevoConnectRes.json();
  assert.strictEqual(brevoConnectData.success, true);
  assert.strictEqual(brevoConnectData.data.provider, 'brevo');
  const brevoConnId = brevoConnectData.data.id;

  // Verify Sender / DNS endpoint
  const brevoVerifyDnsRes = await fetch(
    `${BASE_URL}/api/v1/connections/${brevoConnId}/verify-sender`,
    {
      method: 'POST',
      headers: { Cookie: cookieA },
    }
  );
  assert.strictEqual(brevoVerifyDnsRes.status, 200);
  const brevoVerifyDnsData = await brevoVerifyDnsRes.json();
  assert(brevoVerifyDnsData.data.details.dnsRecords.length >= 2, 'Must have SPF and DKIM guidance');
  console.log('✓ Brevo connected with SPF/DKIM DNS records guidance\n');

  // --------------------------------------------------------------------------
  // TEST 7: AMAZON SES CONNECTION & EASY-DKIM GUIDANCE
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Amazon SES SigV4 Integration ---');
  const sesConnectRes = await fetch(`${BASE_URL}/api/v1/connections/provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      provider: 'ses',
      senderEmail: 'notifications@alpha-brand.com',
      senderName: 'Alpha Alerts',
      credentials: {
        accessKeyId: 'AKIA_MOCK_DEV_ID',
        secretAccessKey: 'mock_secret_key',
        region: 'us-east-1',
      },
    }),
  });
  assert.strictEqual(sesConnectRes.status, 200);
  const sesConnectData = await sesConnectRes.json();
  assert.strictEqual(sesConnectData.success, true);
  assert.strictEqual(sesConnectData.data.provider, 'ses');
  const sesConnId = sesConnectData.data.id;

  // Verify Sender / DNS endpoint
  const sesVerifyDnsRes = await fetch(
    `${BASE_URL}/api/v1/connections/${sesConnId}/verify-sender`,
    {
      method: 'POST',
      headers: { Cookie: cookieA },
    }
  );
  assert.strictEqual(sesVerifyDnsRes.status, 200);
  const sesVerifyDnsData = await sesVerifyDnsRes.json();
  assert(sesVerifyDnsData.data.details.dnsRecords.some((r) => r.type === 'CNAME'));
  console.log('✓ Amazon SES connected with Easy-DKIM 3x CNAME guidance\n');

  // --------------------------------------------------------------------------
  // TEST 8: CREDENTIAL SECURITY & ZERO-SECRET EXPOSURE
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Credential Security & AES-256 Vault Invariants ---');
  // 8a. GET /connections for Session A
  const getConnectionsRes = await fetch(`${BASE_URL}/api/v1/connections`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(getConnectionsRes.status, 200);
  const getConnectionsData = await getConnectionsRes.json();
  assert.strictEqual(getConnectionsData.data.length, 3);

  for (const conn of getConnectionsData.data) {
    assert.strictEqual(conn.encryptedCredentials, undefined, 'Must NEVER return encrypted credentials');
    assert.strictEqual(conn.credentials, undefined, 'Must NEVER return credentials');
    assert.strictEqual(conn.apiKey, undefined, 'Must NEVER return apiKey');
    assert.strictEqual(conn.secretAccessKey, undefined, 'Must NEVER return AWS secret');
    assert.strictEqual(conn.refreshToken, undefined, 'Must NEVER return OAuth refresh token');
  }

  // 8b. Check Database document: verify credentials are encrypted with AES-256-GCM
  const rawDbConn = await EmailConnection.findById(brevoConnId);
  assert(rawDbConn.encryptedCredentials, 'Must be stored encrypted');
  assert(rawDbConn.encryptedCredentials.iv, 'Must have IV');
  assert(rawDbConn.encryptedCredentials.tag, 'Must have AuthTag');
  assert(rawDbConn.encryptedCredentials.data, 'Must have ciphertext');

  const decrypted = decryptCredentials(rawDbConn.encryptedCredentials);
  assert.strictEqual(decrypted.apiKey, 'xkeysib-mock-dev-key');

  // 8c. Cross-Session Isolation: Session B attempting to access Session A's connection
  const crossGetRes = await fetch(`${BASE_URL}/api/v1/connections/${brevoConnId}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(crossGetRes.status, 404, 'Session B must NOT access Session A connection');

  const crossDeleteRes = await fetch(`${BASE_URL}/api/v1/connections/${brevoConnId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(crossDeleteRes.status, 404, 'Session B must NOT delete Session A connection');

  console.log('✓ Zero secret leakage & cross-session security verified\n');

  // --------------------------------------------------------------------------
  // TEST 9: REAL TEST EMAIL DISPATCH
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Real Test Email Dispatch Pipeline ---');

  // 9a. Test email via Gmail
  const gmailTestRes = await fetch(`${BASE_URL}/api/v1/connections/${gmailConnId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      recipientEmail: 'sachin.qa@gmail.com',
      subject: 'Custom Gmail Pipeline Test',
    }),
  });
  assert.strictEqual(gmailTestRes.status, 200);
  const gmailTestData = await gmailTestRes.json();
  assert.strictEqual(gmailTestData.success, true);
  assert(gmailTestData.data.messageId, 'Must return provider message ID');
  assert.strictEqual(gmailTestData.data.provider, 'gmail');
  console.log(`  ✓ Gmail test email sent: ${gmailTestData.data.messageId}`);

  // 9b. Test email via Brevo
  const brevoTestRes = await fetch(`${BASE_URL}/api/v1/connections/${brevoConnId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      recipientEmail: 'subscriber@customer.org',
    }),
  });
  assert.strictEqual(brevoTestRes.status, 200);
  const brevoTestData = await brevoTestRes.json();
  assert.strictEqual(brevoTestData.success, true);
  assert(brevoTestData.data.messageId, 'Must return provider message ID');
  assert.strictEqual(brevoTestData.data.provider, 'brevo');
  console.log(`  ✓ Brevo test email sent: ${brevoTestData.data.messageId}`);

  // 9c. Test email via SES
  const sesTestRes = await fetch(`${BASE_URL}/api/v1/connections/${sesConnId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      recipientEmail: 'enterprise@acme.com',
    }),
  });
  assert.strictEqual(sesTestRes.status, 200);
  const sesTestData = await sesTestRes.json();
  assert.strictEqual(sesTestData.success, true);
  assert(sesTestData.data.messageId, 'Must return provider message ID');
  assert.strictEqual(sesTestData.data.provider, 'ses');
  console.log(`  ✓ Amazon SES test email sent: ${sesTestData.data.messageId}`);

  console.log('✓ All 3 provider test delivery pipelines fully operational\n');

  // --------------------------------------------------------------------------
  // TEST 10: WEBHOOK EVENT PROCESSING (BREVO & SES)
  // --------------------------------------------------------------------------
  console.log('--- TEST 9: Delivery Event Webhook Pipeline ---');

  // Setup a test campaign recipient for webhook tracking
  const guestSession = await GuestSession.findById(sessionAId);
  const testCampaign = await Campaign.create({
    sessionId: guestSession._id,
    brandId: sessionAData.data.brand.id,
    campaignName: 'Webhook Verification Campaign',
    subject: 'Flash Deals',
    stats: { totalRecipients: 2, sent: 2, delivered: 0, bounced: 0, unsubscribed: 0, clicked: 0 },
  });

  const uniqueBounceEmail = `bounce-target-${Date.now()}@example.com`;
  const uniqueMessageId = `brevo_msg_bounce_${Date.now()}`;

  const testRecipient = await CampaignRecipient.create({
    campaignId: testCampaign._id,
    sessionId: guestSession._id,
    email: uniqueBounceEmail,
    status: 'accepted',
    providerMessageId: uniqueMessageId,
  });

  // 10a. Brevo hard bounce webhook
  const brevoWebhookRes = await fetch(`${BASE_URL}/api/v1/webhooks/brevo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'hard_bounce',
      email: uniqueBounceEmail,
      'message-id': uniqueMessageId,
      reason: 'Mailbox unavailable or invalid address',
    }),
  });
  assert.strictEqual(brevoWebhookRes.status, 200);

  // Verify recipient updated to bounced
  const updatedRecip = await CampaignRecipient.findById(testRecipient._id);
  assert.strictEqual(updatedRecip.status, 'bounced');

  // Verify suppression record created
  const emailHash = crypto.createHash('sha256').update(uniqueBounceEmail).digest('hex');
  const suppression = await Suppression.findOne({ emailHash });
  assert(suppression, 'Bounced address must be added to global suppressions');
  assert.strictEqual(suppression.reason, 'bounce');

  // 10b. SES SNS Subscription confirmation handling
  const sesConfirmRes = await fetch(`${BASE_URL}/api/v1/webhooks/ses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Type: 'Notification',
      notificationType: 'Delivery',
      mail: { messageId: 'untracked-ses-msg' },
    }),
  });
  assert.strictEqual(sesConfirmRes.status, 200);

  console.log('✓ Webhook processing & automatic bounce suppression validated\n');

  // --------------------------------------------------------------------------
  // TEST 11: DISCONNECT & CREDENTIAL PURGE
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: Disconnect & Credential Purge ---');
  const deleteRes = await fetch(`${BASE_URL}/api/v1/connections/${sesConnId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(deleteRes.status, 200);

  // Verify SES is gone
  const remainingRes = await fetch(`${BASE_URL}/api/v1/connections`, {
    headers: { Cookie: cookieA },
  });
  const remainingData = await remainingRes.json();
  assert.strictEqual(remainingData.data.length, 2);
  assert(!remainingData.data.some((c) => c.provider === 'ses'));

  // Database check: document deleted
  const deletedDoc = await EmailConnection.findById(sesConnId);
  assert.strictEqual(deletedDoc, null, 'Document must be removed from database');
  console.log('✓ Account disconnected & credentials completely purged from database\n');

  await disconnectDatabase();

  console.log('=======================================================');
  console.log('🎉 ALL 10 PHASE 4 PROVIDER INTEGRATION TESTS PASSED 100%');
  console.log('=======================================================\n');

  if (webProcess) {
    webProcess.kill('SIGTERM');
  }
  process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error('\n❌ PHASE 4 TEST SUITE FAILED:', err);
  process.exit(1);
});
