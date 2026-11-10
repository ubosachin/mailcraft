import assert from 'node:assert';
import { spawn } from 'node:child_process';

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
      // waiting for server
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function runE2ETests() {
  console.log('🚀 Running MailCraft End-to-End API Integration Suite...');

  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for API tests...');
    webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
      stdio: 'ignore',
      env: { ...process.env, PORT: '3000' },
    });
    await waitForServer(BASE_URL);
    console.log('✓ Next.js server operational on port 3000');
  }

  // 1. Healthcheck
  const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthData.status, 'healthy');
  assert.strictEqual(healthData.database, 'connected');
  console.log('✓ Healthcheck endpoint operational (/api/v1/health)');

  // 2. Verify Guest Mode Disabled
  const disabledGuestRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(disabledGuestRes.status, 410, 'Guest mode must return 410 Gone');
  console.log('✓ Confirmed guest mode is disabled (/api/v1/guest/start -> 410)');

  // 3. Sign Up Authenticated User
  const runId = Date.now();
  const userEmail = `elena.${runId}@gmail.com`;
  const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: `StarlightPass#${runId}`,
      name: 'Elena Rostova',
      brandName: 'Starlight Apparel',
    }),
  });
  const signupData = await signupRes.json();
  assert.strictEqual(signupRes.status, 201);
  assert(signupData.data.session.id, 'Session ID must exist');
  assert.strictEqual(signupData.data.user.email, userEmail);

  // Extract cookie from Set-Cookie header
  const rawCookie = signupRes.headers.get('set-cookie');
  assert(rawCookie, 'Set-Cookie header must be returned');
  const sessionCookie = rawCookie.split(';')[0];
  console.log(`✓ Authenticated user created: ${userEmail} (${signupData.data.session.id})`);

  // 4. Query Me with Cookie
  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meData = await meRes.json();
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meData.data.authenticated, true);
  assert.strictEqual(meData.data.session.id, signupData.data.session.id);
  console.log('✓ Authenticated user session resolved via HttpOnly cookie (/api/v1/auth/me)');

  // 5. Save/Update Brand Profile
  const brandRes = await fetch(`${BASE_URL}/api/v1/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      brandName: 'Starlight Apparel',
      senderName: 'Elena Rostova',
      senderEmail: 'elena@starlight.com',
      website: 'https://starlight.com',
      logoUrl: 'https://starlight.com/logo.png',
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
      footerAddress: '789 Fashion Way, New York, NY 10001',
    }),
  });
  const brandData = await brandRes.json();
  assert.strictEqual(brandRes.status, 200);
  assert.strictEqual(brandData.data.brandName, 'Starlight Apparel');
  assert.strictEqual(brandData.data.primaryColor, '#6366F1');
  console.log('✓ Brand profile & color tokens persisted (/api/v1/brands)');

  // 6. Query Current Brand
  const curBrandRes = await fetch(`${BASE_URL}/api/v1/brands/current`, {
    headers: { Cookie: sessionCookie },
  });
  const curBrandData = await curBrandRes.json();
  assert.strictEqual(curBrandRes.status, 200);
  assert.strictEqual(curBrandData.data.brandName, 'Starlight Apparel');
  console.log('✓ Current brand retrieved (/api/v1/brands/current)');

  // 7. Request OTP Verification
  const verifyRes = await fetch(`${BASE_URL}/api/v1/account/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ email: 'elena@starlight.com' }),
  });
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyRes.status, 200);
  assert(verifyData.data.devCode, 'Development OTP code returned');
  const otpCode = verifyData.data.devCode;
  console.log(`✓ OTP verification code requested and received: ${otpCode}`);

  // 8. Confirm OTP Verification
  const confirmRes = await fetch(`${BASE_URL}/api/v1/account/verify-email/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      email: 'elena@starlight.com',
      code: otpCode,
    }),
  });
  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmRes.status, 200);
  assert.strictEqual(confirmData.data.verified, true);
  console.log('✓ Email verification confirmed and bound to account (/api/v1/account/verify-email/confirm)');

  // 9. Logout & Revoke Session
  const endRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  const endData = await endRes.json();
  assert.strictEqual(endRes.status, 200);
  assert.strictEqual(endData.data.loggedOut, true);
  console.log('✓ Session revoked and cookie cleared (/api/v1/auth/logout)');

  console.log('\n🎉 ALL END-TO-END API INTEGRATION TESTS PASSED PERFECTLY!\n');

  if (webProcess) {
    webProcess.kill('SIGTERM');
  }
  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});

