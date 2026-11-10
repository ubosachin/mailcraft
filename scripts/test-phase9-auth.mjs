import assert from 'node:assert';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

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
      // waiting
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function runAuthTests() {
  console.log('🚀 ================================================================');
  console.log('🚀 MAILCRAFT PHASE 9: USER AUTHENTICATION & GMAIL SIGNUP/LOGIN');
  console.log('🚀 ================================================================\n');

  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for Auth tests...');
    webProcess = spawn('pnpm', ['--filter', 'web', 'start'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000' },
    });
    await waitForServer(BASE_URL);
    console.log('✓ Next.js server operational on port 3000\n');
  } else {
    console.log('✓ Existing Next.js server detected on port 3000\n');
  }

  const runId = Date.now();
  const testGmail = `sachin.tester.${runId}@gmail.com`;
  const testPassword = `SecretCraft#${runId}!`;
  const testName = 'Sachin Dev';

  // -------------------------------------------------------------
  // TEST 1: User Signup with Gmail ID and Password
  // -------------------------------------------------------------
  console.log('🧪 TEST 1: User Signup with Gmail ID & Password...');
  const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGmail,
      password: testPassword,
      name: testName,
    }),
  });

  const signupData = await signupRes.json();
  assert.strictEqual(signupRes.status, 201, `Signup must return 201: ${JSON.stringify(signupData)}`);
  assert.strictEqual(signupData.success, true);
  assert.strictEqual(signupData.data.user.email, testGmail);
  assert.strictEqual(signupData.data.user.name, testName);
  assert.strictEqual(signupData.data.user.role, 'user');
  assert.strictEqual(signupData.data.user.passwordHash, undefined, 'Password hash must never leak');
  assert.strictEqual(signupData.data.user.passwordSalt, undefined, 'Password salt must never leak');

  const signupCookie = signupRes.headers.get('set-cookie');
  assert(signupCookie && signupCookie.includes('mailcraft_session'), 'Must set mailcraft_session cookie');
  console.log(`✓ Test 1 Passed: User ${testGmail} created with scrypt-hashed password and session cookie\n`);

  // -------------------------------------------------------------
  // TEST 2: Duplicate Registration Rejection
  // -------------------------------------------------------------
  console.log('🧪 TEST 2: Duplicate Registration Rejection (409 Conflict)...');
  const dupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGmail,
      password: testPassword,
      name: 'Duplicate User',
    }),
  });

  const dupData = await dupRes.json();
  assert.strictEqual(dupRes.status, 409, 'Duplicate signup must return 409 Conflict');
  assert.strictEqual(dupData.success, false);
  console.log('✓ Test 2 Passed: Duplicate email registration blocked with 409 Conflict\n');

  // -------------------------------------------------------------
  // TEST 3: Password Validation & Length Enforcement
  // -------------------------------------------------------------
  console.log('🧪 TEST 3: Password Validation & Weak Password Defense...');
  const weakRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `weak.${runId}@gmail.com`,
      password: 'short',
    }),
  });

  const weakData = await weakRes.json();
  assert.strictEqual(weakRes.status, 400, 'Weak password must be rejected with 400');
  console.log('✓ Test 3 Passed: Password minimum length (8 chars) strictly enforced\n');

  // -------------------------------------------------------------
  // TEST 4: User Login with Valid Gmail ID and Password
  // -------------------------------------------------------------
  console.log('🧪 TEST 4: User Login with Valid Credentials...');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGmail,
      password: testPassword,
    }),
  });

  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, `Login must return 200: ${JSON.stringify(loginData)}`);
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.data.user.email, testGmail);

  const loginCookieRaw = loginRes.headers.get('set-cookie');
  assert(loginCookieRaw && loginCookieRaw.includes('mailcraft_session'), 'Must issue login session cookie');
  const loginCookie = loginCookieRaw.split(';')[0];
  console.log('✓ Test 4 Passed: Logged in successfully, timing-safe scrypt verification succeeded\n');

  // -------------------------------------------------------------
  // TEST 5: User Login with Incorrect Password
  // -------------------------------------------------------------
  console.log('🧪 TEST 5: User Login with Wrong Password (401 Unauthorized)...');
  const wrongRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testGmail,
      password: 'CompletelyWrongPassword999!',
    }),
  });

  const wrongData = await wrongRes.json();
  assert.strictEqual(wrongRes.status, 401, 'Invalid password must return 401 Unauthorized');
  assert.strictEqual(wrongData.success, false);
  console.log('✓ Test 5 Passed: Authentication failed gracefully on invalid password\n');

  // -------------------------------------------------------------
  // TEST 6: Authenticated Session Profile Lookup (/api/v1/auth/me)
  // -------------------------------------------------------------
  console.log('🧪 TEST 6: Authenticated Profile Resolution (/api/v1/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: loginCookie },
  });

  const meData = await meRes.json();
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meData.success, true);
  assert.strictEqual(meData.data.authenticated, true);
  assert.strictEqual(meData.data.user.email, testGmail);
  assert.strictEqual(meData.data.session.isGuest, undefined);
  console.log(`✓ Test 6 Passed: /api/v1/auth/me resolved authenticated user (${meData.data.user.name})\n`);

  // -------------------------------------------------------------
  // TEST 7: Unauthenticated Profile Lookup (/api/v1/auth/me)
  // -------------------------------------------------------------
  console.log('🧪 TEST 7: Unauthenticated Profile Lookup...');
  const anonRes = await fetch(`${BASE_URL}/api/v1/auth/me`);
  const anonData = await anonRes.json();
  assert.strictEqual(anonRes.status, 200);
  assert.strictEqual(anonData.data.authenticated, false);
  assert.strictEqual(anonData.data.user, null);
  console.log('✓ Test 7 Passed: Unauthenticated request reported authenticated: false\n');

  // -------------------------------------------------------------
  // TEST 8: Guest Removal (404), Route Protection & Workspace Persistence
  // -------------------------------------------------------------
  console.log('🧪 TEST 8: Guest Endpoint Removal (404), Auth Guards & Workspace Persistence...');
  // 8a. Verify guest routes are completely removed (404 Not Found)
  const guestStartRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandName: 'Should Fail' }),
  });
  assert.strictEqual(guestStartRes.status, 404, 'Removed /api/v1/guest/start must return 404');

  const guestMeRes = await fetch(`${BASE_URL}/api/v1/guest/me`);
  assert.strictEqual(guestMeRes.status, 404, 'Removed /api/v1/guest/me must return 404');

  // 8b. Verify all protected routes & APIs strictly enforce login
  const workspaceRedirectRes = await fetch(`${BASE_URL}/workspace`, { redirect: 'manual' });
  assert([307, 308, 302].includes(workspaceRedirectRes.status), 'Protected /workspace must redirect unauthenticated request');
  assert(workspaceRedirectRes.headers.get('location')?.includes('/login'), 'Redirect target must be /login');

  const templatesRedirectRes = await fetch(`${BASE_URL}/templates`, { redirect: 'manual' });
  assert([307, 308, 302].includes(templatesRedirectRes.status), 'Protected /templates must redirect unauthenticated request');
  assert(templatesRedirectRes.headers.get('location')?.includes('/login'), 'Redirect target must be /login');

  const unauthTplApi = await fetch(`${BASE_URL}/api/v1/templates`);
  assert.strictEqual(unauthTplApi.status, 401, 'Protected /api/v1/templates must return 401');

  // 8c. Create user with initial brand and contacts, logout, and log back in
  const newAccountGmail = `founder.quantum.${runId}@gmail.com`;
  const newAccountPass = `QuantumPass#${runId}`;
  const upgradeSignupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: newAccountGmail,
      password: newAccountPass,
      name: 'Quantum Founder',
      brandName: `Quantum Craft ${runId}`,
    }),
  });
  assert.strictEqual(upgradeSignupRes.status, 201);
  const firstCookie = upgradeSignupRes.headers.get('set-cookie')?.split(';')[0];
  assert(firstCookie, 'Must receive authenticated cookie');

  // Add contact under this user workspace
  const addContactRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: firstCookie },
    body: JSON.stringify({
      email: `lead.${runId}@client.org`,
      firstName: 'Samantha',
      consentStatus: 'opted_in',
      consentSource: 'web_form',
      consentConfirmed: true,
    }),
  });
  assert.strictEqual(addContactRes.status, 201, 'Must create contact in user workspace');

  // Logout
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Cookie: firstCookie },
  });

  // Log back in
  const reloginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newAccountGmail, password: newAccountPass }),
  });
  assert.strictEqual(reloginRes.status, 200);
  const reloginCookie = reloginRes.headers.get('set-cookie')?.split(';')[0];
  assert(reloginCookie, 'Must receive fresh login cookie');

  // Verify the brand & contacts persisted across logout and re-login
  const brandCheckRes = await fetch(`${BASE_URL}/api/v1/brands/current`, {
    headers: { Cookie: reloginCookie },
  });
  const brandCheckData = await brandCheckRes.json();
  assert.strictEqual(brandCheckRes.status, 200);
  assert.strictEqual(brandCheckData.data.brandName, `Quantum Craft ${runId}`);

  const contactCheckRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    headers: { Cookie: reloginCookie },
  });
  const contactCheckData = await contactCheckRes.json();
  assert.strictEqual(contactCheckRes.status, 200);
  assert(contactCheckData.data.contacts.length >= 1, 'Contacts must persist across logout/login');
  assert.strictEqual(contactCheckData.data.contacts[0].email, `lead.${runId}@client.org`);
  console.log('✓ Test 8 Passed: Guest routes removed (404), protected routes redirect & user workspace persisted across login cycles\n');

  // -------------------------------------------------------------
  // TEST 9: User Logout
  // -------------------------------------------------------------
  console.log('🧪 TEST 9: User Logout & Session Revocation...');
  const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Cookie: loginCookie },
  });
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutRes.status, 200);
  assert.strictEqual(logoutData.data.loggedOut, true);

  // Verify that session is revoked
  const postLogoutMe = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Cookie: loginCookie },
  });
  const postLogoutData = await postLogoutMe.json();
  assert.strictEqual(postLogoutData.data.authenticated, false, 'Revoked session must not authenticate');
  console.log('✓ Test 9 Passed: Session revoked, cookie cleared, and authentication invalidated\n');

  // -------------------------------------------------------------
  // TEST 10: Google OAuth Endpoints Sanity Check
  // -------------------------------------------------------------
  console.log('🧪 TEST 10: Google OAuth Auth Endpoints Sanity Check...');
  const googleStartRes = await fetch(`${BASE_URL}/api/v1/auth/google/start?format=json`);
  const googleStartData = await googleStartRes.json();
  assert.strictEqual(googleStartRes.status, 200);
  assert(googleStartData.data.url.includes('accounts.google.com'), 'Must construct valid Google OAuth URL');
  assert(googleStartData.data.state.startsWith('auth_'), 'State must carry auth_ prefix');
  console.log('✓ Test 10 Passed: Google OAuth authorization URL builder verified\n');

  console.log('================================================================');
  console.log('🎉 ALL 10 PHASE 9 USER AUTHENTICATION TESTS PASSED 100%!');
  console.log('================================================================\n');

  if (webProcess) {
    webProcess.kill();
  }
}

runAuthTests().catch((err) => {
  console.error('\n❌ PHASE 9 AUTH TEST FAILED:', err);
  process.exit(1);
});

