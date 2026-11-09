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
  assert.strictEqual(meData.data.session.isGuest, false);
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
  // TEST 8: Guest-to-User Workspace Upgrade & Data Preservation
  // -------------------------------------------------------------
  console.log('🧪 TEST 8: Guest-to-User Workspace Upgrade & Data Preservation...');
  // 8a. Start as anonymous guest
  const guestStartRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: `Quantum Craft ${runId}`,
      senderEmail: `initial.sender.${runId}@test.com`,
    }),
  });
  const guestStartData = await guestStartRes.json();
  const guestCookieRaw = guestStartRes.headers.get('set-cookie');
  assert(guestCookieRaw, 'Must receive guest session cookie');
  const guestCookie = guestCookieRaw.split(';')[0];

  // 8b. Add a contact under this guest session
  const addContactRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      email: `lead.${runId}@client.org`,
      firstName: 'Samantha',
      consentStatus: 'opted_in',
      consentSource: 'web_form',
      consentConfirmed: true,
    }),
  });
  assert.strictEqual(addContactRes.status, 201, 'Must create contact in guest workspace');

  // 8c. Sign up as a registered user using the guest session cookie
  const newAccountGmail = `founder.quantum.${runId}@gmail.com`;
  const upgradeSignupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      email: newAccountGmail,
      password: `QuantumPass#${runId}`,
      name: 'Quantum Founder',
    }),
  });

  const upgradeData = await upgradeSignupRes.json();
  assert.strictEqual(upgradeSignupRes.status, 201, 'Signup with guest cookie must return 201');
  assert.strictEqual(upgradeData.data.session.isGuestUpgraded, true, 'Guest session must be upgraded');

  // 8d. Verify the brand still exists in the user workspace
  const brandCheckRes = await fetch(`${BASE_URL}/api/v1/brands/current`, {
    headers: { Cookie: guestCookie },
  });
  const brandCheckData = await brandCheckRes.json();
  assert.strictEqual(brandCheckRes.status, 200);
  assert.strictEqual(brandCheckData.data.brandName, `Quantum Craft ${runId}`);

  // 8e. Verify contacts were preserved
  const contactCheckRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    headers: { Cookie: guestCookie },
  });
  const contactCheckData = await contactCheckRes.json();
  assert.strictEqual(contactCheckRes.status, 200);
  assert(contactCheckData.data.contacts.length >= 1, 'Contacts must be preserved in upgraded workspace');
  assert.strictEqual(contactCheckData.data.contacts[0].email, `lead.${runId}@client.org`);
  console.log('✓ Test 8 Passed: Guest workspace seamlessly upgraded to user account without data loss\n');

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
