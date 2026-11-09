import assert from 'node:assert';
import {
  connectToDatabase,
  disconnectDatabase,
  generateSessionToken,
  hashSessionToken,
  generateVerificationCode,
  hashVerificationCode,
  encryptCredentials,
  decryptCredentials,
  GuestSession,
  Brand,
} from './index.js';

async function runTests() {
  console.log('--- Starting MailCraft Phase 1 Foundation Verification ---');

  // 1. Session Token and Hashing
  const rawToken = generateSessionToken();
  assert(rawToken.startsWith('mc_sess_'), 'Token should start with mc_sess_');
  assert(rawToken.length > 50, 'Token should have high entropy');

  const hash1 = hashSessionToken(rawToken);
  const hash2 = hashSessionToken(rawToken);
  assert.strictEqual(hash1, hash2, 'Session token hashing must be deterministic');
  assert.notStrictEqual(rawToken, hash1, 'Hash must not equal raw token');
  console.log('✓ Cryptographic Session Token & SHA-256 Hashing verified');

  // 2. AES-256-GCM Credential Encryption & Decryption
  const credentials = {
    apiKey: 'xkeysib-test-brevo-key-999',
    refreshToken: '1//0gMOCK_REFRESH_TOKEN_GMAIL',
    scope: 'https://www.googleapis.com/auth/gmail.send',
  };

  const encrypted = encryptCredentials(credentials);
  assert(encrypted.iv && encrypted.tag && encrypted.data, 'Encrypted output must contain iv, tag, data');
  assert.notStrictEqual(encrypted.data, credentials.apiKey, 'Ciphertext must not be plaintext');

  const decrypted = decryptCredentials<typeof credentials>(encrypted);
  assert.strictEqual(decrypted.apiKey, credentials.apiKey, 'Decrypted apiKey must match original');
  assert.strictEqual(decrypted.refreshToken, credentials.refreshToken, 'Decrypted refreshToken must match');
  console.log('✓ AES-256-GCM Credential Encryption & Authenticated Decryption verified');

  // 3. OTP verification code hashing
  const otp = generateVerificationCode();
  assert.strictEqual(otp.length, 6, 'OTP must be 6 digits');
  const otpHash = hashVerificationCode(otp);
  assert.strictEqual(otpHash, hashVerificationCode(otp), 'OTP hash must be deterministic');
  console.log('✓ 6-Digit OTP Generator & Hashing verified');

  // 4. Live MongoDB Connection & Model Integration
  await connectToDatabase();
  console.log('✓ Connected to MongoDB successfully');

  // Create test guest session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionDoc = await GuestSession.create({
    sessionTokenHash: hash1,
    status: 'active',
    expiresAt,
  });

  assert(sessionDoc._id, 'GuestSession document should have _id');
  assert.strictEqual(sessionDoc.sessionTokenHash, hash1);
  console.log('✓ GuestSession persistence in MongoDB verified');

  // Create test brand linked to session
  const brandDoc = await Brand.create({
    sessionId: sessionDoc._id,
    brandName: 'CraftCoffee Labs',
    senderName: 'Sarah Brewer',
    senderEmail: 'sarah@craftcoffee.com',
    primaryColor: '#8B4513',
    secondaryColor: '#D2B48C',
  });

  assert.strictEqual(brandDoc.brandName, 'CraftCoffee Labs');
  assert.strictEqual(brandDoc.sessionId.toString(), sessionDoc._id.toString());
  console.log('✓ Brand model persistence & session association verified');

  // Cleanup test documents
  await Brand.deleteOne({ _id: brandDoc._id });
  await GuestSession.deleteOne({ _id: sessionDoc._id });
  console.log('✓ Test cleanup complete');

  await disconnectDatabase();
  console.log('--- ALL PHASE 1 CORE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

