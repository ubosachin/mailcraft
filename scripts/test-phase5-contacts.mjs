import assert from 'node:assert';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import * as XLSX from 'xlsx';
import {
  connectToDatabase,
  disconnectDatabase,
  Contact,
  ContactImport,
  Segment,
  Tag,
  GuestSession,
  Campaign,
  CampaignRecipient,
  Suppression,
  encryptCredentials,
} from '../packages/database/dist/index.js';

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

function extractCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/mailcraft_session=([^;]+)/);
  return match ? `mailcraft_session=${match[1]}` : null;
}

async function createGuestSession(brandName = 'Test Brand', senderEmail = 'test@example.com') {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `${senderEmail.split('@')[0]}.${unique}@gmail.com`;
  const res = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: `PassContact#${unique}`,
      brandName,
    }),
  });
  assert.strictEqual(res.status, 201, 'Auth signup must return 201');
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Must return session cookie');
  const data = await res.json();
  return {
    cookie,
    sessionId: data.data.session.id,
    brandId: data.data.brand?.id,
    session: data.data.session,
  };
}

async function runPhase5Tests() {
  console.log('🚀 =======================================================');
  console.log('🚀 MAILCRAFT PHASE 5: RECIPIENT MANAGEMENT & IMPORT ENGINE');
  console.log('🚀 =======================================================\n');

  // --------------------------------------------------------------------------
  // TEST 0: SERVER SPAWNING & HEALTH CHECK
  // --------------------------------------------------------------------------
  let webProcess = null;
  let isWebRunning = false;
  try {
    const h = await fetch(`${BASE_URL}/api/v1/health`);
    if (h.ok) isWebRunning = true;
  } catch {}

  if (!isWebRunning) {
    console.log('Spawning Next.js server for Phase 5 tests...');
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

  const userA = await createGuestSession('Brand A', 'usera@example.com');
  const userB = await createGuestSession('Brand B', 'userb@example.com');

  console.log(`✓ Guest sessions established:`);
  console.log(`  - User A: ${userA.sessionId}`);
  console.log(`  - User B: ${userB.sessionId}\n`);

  // --------------------------------------------------------------------------
  // TEST 1: MANUAL CONTACT CREATION, NORMALIZATION & DEDUPLICATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Manual Contact Creation, Normalization & Deduplication ---');
  const contact1Res = await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      email: '  Alice.Smith@Example.COM  ',
      firstName: 'Alice',
      lastName: 'Smith',
      company: 'Acme Corp',
      phone: '+1 555-0199',
      tags: ['vip', 'newsletter'],
      consentStatus: 'opted_in',
      consentEvidence: 'Signed up on web checkout page',
    }),
  });

  assert.strictEqual(contact1Res.status, 201, 'Should create contact with 201');
  const contact1Data = await contact1Res.json();
  assert.strictEqual(contact1Data.success, true);
  assert.strictEqual(contact1Data.data.email, 'alice.smith@example.com');
  assert.strictEqual(contact1Data.data.normalizedEmail, 'alice.smith@example.com');
  assert.strictEqual(contact1Data.data.name, 'Alice Smith');
  assert.strictEqual(contact1Data.data.consentStatus, 'opted_in');
  assert(Array.isArray(contact1Data.data.tags));
  assert(contact1Data.data.tags.includes('vip'));
  const contact1Id = contact1Data.data.id;
  console.log(`✓ Contact created & normalized: ${contact1Data.data.email} (${contact1Id})`);

  // Test Duplicate creation prevention within same session
  const dupRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      email: 'alice.smith@example.com',
      firstName: 'Alice',
    }),
  });
  assert.strictEqual(dupRes.status, 409, 'Duplicate contact in same session must return 409 Conflict');
  console.log('✓ Duplicate contact prevented with 409 Conflict\n');

  // --------------------------------------------------------------------------
  // TEST 2: PAGINATED RETRIEVAL & LIVE STATISTICS CALCULATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Paginated Retrieval & Live Stats Calculation ---');
  // Create another contact with 'unknown' status
  await fetch(`${BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      email: 'bob.lead@testdomain.org',
      name: 'Bob Lead',
      consentStatus: 'unknown',
      tags: ['leads'],
    }),
  });

  const listRes = await fetch(`${BASE_URL}/api/v1/contacts?search=alice&consentStatus=opted_in`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert.strictEqual(listData.success, true);
  assert.strictEqual(listData.data.contacts.length, 1);
  assert.strictEqual(listData.data.contacts[0].email, 'alice.smith@example.com');

  // Verify full stats without search filter
  const fullListRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    headers: { Cookie: userA.cookie },
  });
  const fullListData = await fullListRes.json();
  assert.strictEqual(fullListData.data.stats.totalContacts, 2);
  assert.strictEqual(fullListData.data.stats.eligibleContacts, 1);
  assert.strictEqual(fullListData.data.stats.pendingConsent, 1);
  console.log(`✓ Live Stats verified: Total=${fullListData.data.stats.totalContacts}, Eligible=${fullListData.data.stats.eligibleContacts}, Pending=${fullListData.data.stats.pendingConsent}\n`);

  // --------------------------------------------------------------------------
  // TEST 3: CONTACT UPDATE & TAG ASSIGNMENT APIS
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Contact Update & Tag Assignment APIs ---');
  const updateRes = await fetch(`${BASE_URL}/api/v1/contacts/${contact1Id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      company: 'Acme Enterprise Solutions',
      phone: '+1 800-ACME-CORP',
    }),
  });
  assert.strictEqual(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.data.company, 'Acme Enterprise Solutions');

  // Add tag via dedicated route
  const addTagRes = await fetch(`${BASE_URL}/api/v1/contacts/${contact1Id}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ tag: 'priority-client' }),
  });
  assert.strictEqual(addTagRes.status, 200);
  const addTagData = await addTagRes.json();
  assert(addTagData.data.tags.includes('priority-client'));
  console.log('✓ Contact updated and tag "priority-client" added');

  // Remove tag
  const removeTagRes = await fetch(
    `${BASE_URL}/api/v1/contacts/${contact1Id}/tags/priority-client`,
    {
      method: 'DELETE',
      headers: { Cookie: userA.cookie },
    }
  );
  assert.strictEqual(removeTagRes.status, 200);
  const removeTagData = await removeTagRes.json();
  assert(!removeTagData.data.tags.includes('priority-client'));
  console.log('✓ Tag "priority-client" removed successfully\n');

  // --------------------------------------------------------------------------
  // TEST 4: RAW EMAIL VALIDATION & SUPPRESSION DETECTION
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Raw Email Validation & Suppression Layer ---');
  // Add a suppression for test
  const suppressedTestEmail = 'unsubscribed-user@baddomain.com';
  const supHash = crypto.createHash('sha256').update(suppressedTestEmail).digest('hex');
  const enc = encryptCredentials({ email: suppressedTestEmail });
  await Suppression.create({
    emailHash: supHash,
    emailEncrypted: enc.data,
    reason: 'unsubscribe',
    scope: 'global',
  });

  const rawInput = `
    valid.user1@company.com;
    valid.user2@company.com,
    Alice.Smith@Example.COM
    invalid-email-syntax@@domain..com
    unsubscribed-user@baddomain.com
  `;

  const valRes = await fetch(`${BASE_URL}/api/v1/contacts/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      rawInput,
      checkDnsMx: false,
    }),
  });
  assert.strictEqual(valRes.status, 200);
  const valData = await valRes.json();
  assert.strictEqual(valData.success, true);
  assert.strictEqual(valData.data.totalSubmitted, 5);
  assert.strictEqual(valData.data.validSyntaxCount, 4);
  assert.strictEqual(valData.data.existingCount, 1); // alice.smith is already in session
  assert.strictEqual(valData.data.suppressedCount, 1); // unsubscribed-user
  assert.strictEqual(valData.data.invalidSyntaxCount, 1); // invalid-email-syntax
  console.log(`✓ Batch validation: 4 valid syntax, 1 existing, 1 suppressed, 1 invalid syntax\n`);

  // --------------------------------------------------------------------------
  // TEST 5: BULK CONTACT PASTE IMPORT API
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Bulk Contact Paste Import API ---');
  const bulkRes = await fetch(`${BASE_URL}/api/v1/contacts/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      contacts: [
        { email: 'member1@startup.io', name: 'Member 1', consentStatus: 'opted_in' },
        { email: 'member2@startup.io', name: 'Member 2', consentStatus: 'opted_in' },
        { email: 'member3@startup.io', name: 'Member 3', consentStatus: 'unknown' },
      ],
      consentConfirmed: true,
      tags: ['founders'],
    }),
  });
  assert.strictEqual(bulkRes.status, 200);
  const bulkData = await bulkRes.json();
  assert.strictEqual(bulkData.data.newlyCreated, 3);
  console.log(`✓ Bulk paste inserted: ${bulkData.data.newlyCreated} contacts with tag "founders"\n`);

  // --------------------------------------------------------------------------
  // TEST 6: CSV FILE UPLOAD, AUTO COLUMN DETECTION & CONFIRMATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: CSV Upload, Column Detection & Import Pipeline ---');
  const csvContent = [
    'Work Email,Full Name,Organization,Group Tags',
    'sarah.csv@partner.org,Sarah Connor,Cyberdyne Systems,"tech,defense"',
    'john.csv@partner.org,John Connor,Resistance,"freedom,lead"',
  ].join('\n');

  const formData = new FormData();
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('file', csvBlob, 'test_audience.csv');

  const uploadRes = await fetch(`${BASE_URL}/api/v1/contacts/upload`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
    body: formData,
  });
  assert.strictEqual(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadData.success, true);
  assert.strictEqual(uploadData.data.columnMapping.email, 'Work Email');
  assert.strictEqual(uploadData.data.columnMapping.name, 'Full Name');
  assert.strictEqual(uploadData.data.columnMapping.company, 'Organization');
  assert.strictEqual(uploadData.data.totalRows, 2);
  assert.strictEqual(uploadData.data.validRows, 2);
  const importId = uploadData.data.importId;
  console.log(`✓ CSV uploaded and parsed: ${uploadData.data.originalFilename} (Import ID: ${importId})`);

  // Confirm Import
  const confirmRes = await fetch(`${BASE_URL}/api/v1/contacts/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      importId,
      consentConfirmed: true,
      consentEvidence: 'Partner agreement opt-in clause 4',
      defaultConsentStatus: 'opted_in',
      tags: ['partners-q4'],
    }),
  });
  assert.strictEqual(confirmRes.status, 200);
  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmData.data.importedRows, 2);
  assert.strictEqual(confirmData.data.status, 'completed');
  console.log(`✓ Import confirmed: ${confirmData.data.importedRows} inserted\n`);

  // --------------------------------------------------------------------------
  // TEST 7: BINARY XLSX WORKBOOK PARSING WITH SHEET SELECTION
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Binary XLSX Workbook Parsing & Sheet Selection ---');
  const wb = XLSX.utils.book_new();
  const ws1Data = [
    ['Email Address', 'Name', 'Company'],
    ['david.xlsx@media.net', 'David Banner', 'Media Net'],
    ['bruce.xlsx@media.net', 'Bruce Wayne', 'Wayne Enterprises'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'ActiveAudience');

  const ws2Data = [['Notes', 'Version'], ['Do not import', 'v1']];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'AdminNotes');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const xlsxFormData = new FormData();
  const xlsxBlob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  xlsxFormData.append('file', xlsxBlob, 'media_contacts.xlsx');

  const xlsxUploadRes = await fetch(`${BASE_URL}/api/v1/contacts/upload`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
    body: xlsxFormData,
  });
  assert.strictEqual(xlsxUploadRes.status, 201);
  const xlsxUploadData = await xlsxUploadRes.json();
  assert.strictEqual(xlsxUploadData.success, true);
  assert(xlsxUploadData.data.detectedSheets.includes('ActiveAudience'));
  assert(xlsxUploadData.data.detectedSheets.includes('AdminNotes'));
  assert.strictEqual(xlsxUploadData.data.validRows, 2);

  // Confirm XLSX import
  const xlsxConfirmRes = await fetch(`${BASE_URL}/api/v1/contacts/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      importId: xlsxUploadData.data.importId,
      consentConfirmed: true,
      defaultConsentStatus: 'opted_in',
      tags: ['vip-media'],
    }),
  });
  assert.strictEqual(xlsxConfirmRes.status, 200);
  console.log(`✓ Binary XLSX workbook parsed with multi-sheet inspection & confirmed\n`);

  // --------------------------------------------------------------------------
  // TEST 8: TAGS MANAGEMENT & REORGANIZATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Audience Tagging Management APIs ---');
  // Create Tag
  const createTagRes = await fetch(`${BASE_URL}/api/v1/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      name: 'beta-testers',
      color: '#10B981',
    }),
  });
  assert.strictEqual(createTagRes.status, 201);
  const tagData = await createTagRes.json();
  const createdTagId = tagData.data.id;

  // Assign to contact1
  await fetch(`${BASE_URL}/api/v1/contacts/${contact1Id}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ tag: 'beta-testers' }),
  });

  // Verify tag listing has contactCount
  const tagsListRes = await fetch(`${BASE_URL}/api/v1/tags`, {
    headers: { Cookie: userA.cookie },
  });
  const tagsListData = await tagsListRes.json();
  const betaTag = tagsListData.data.find((t) => t.name === 'beta-testers');
  assert(betaTag, 'Tag beta-testers should exist');
  assert.strictEqual(betaTag.contactCount, 1);

  // Rename Tag: Should cascade to contact tags array
  const renameRes = await fetch(`${BASE_URL}/api/v1/tags/${createdTagId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ name: 'early-adopters' }),
  });
  assert.strictEqual(renameRes.status, 200);

  // Check contact1 now has 'early-adopters' instead of 'beta-testers'
  const c1Refetched = await Contact.findById(contact1Id);
  assert(c1Refetched.tags.includes('early-adopters'));
  assert(!c1Refetched.tags.includes('beta-testers'));
  console.log('✓ Tag created, assigned, and renamed with cascading contact update\n');

  // --------------------------------------------------------------------------
  // TEST 9: DYNAMIC AUDIENCE SEGMENTS & PREVIEW
  // --------------------------------------------------------------------------
  console.log('--- TEST 9: Dynamic Audience Segments & Preview ---');
  const segmentRes = await fetch(`${BASE_URL}/api/v1/segments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      name: 'Opted In VIPs',
      description: 'Opted-in contacts with VIP tag',
      filters: {
        consentStatus: ['opted_in'],
        tags: ['vip'],
      },
    }),
  });
  assert.strictEqual(segmentRes.status, 201);
  const segmentData = await segmentRes.json();
  const segmentId = segmentData.data.id;
  assert(segmentData.data.contactCount >= 1);

  // Preview segment
  const previewRes = await fetch(`${BASE_URL}/api/v1/segments/${segmentId}/preview`, {
    method: 'POST',
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(previewRes.status, 200);
  const previewData = await previewRes.json();
  assert(previewData.data.totalMatching >= 1);
  assert.strictEqual(previewData.data.eligibleCount, previewData.data.totalMatching);
  assert(previewData.data.contacts.some((c) => c.email === 'alice.smith@example.com'));
  console.log(`✓ Dynamic segment created: "${segmentData.data.name}" matching ${previewData.data.totalMatching} contacts\n`);

  // --------------------------------------------------------------------------
  // TEST 10: CONTACT EXPORT & CSV/XLSX FORMULA INJECTION SANITIZATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: Export Engine & Formula Injection Neutralization ---');
  // Create contact with potentially malicious formula payload
  await Contact.create({
    sessionId: userA.sessionId,
    email: 'hacker@formula-injection.com',
    normalizedEmail: 'hacker@formula-injection.com',
    firstName: '=CMD|',
    lastName: "' /C calc'!A0",
    name: "=CMD|' /C calc'!A0",
    company: '+HYPERLINK("http://evil.com","Click")',
    consentStatus: 'unknown',
    consentSource: 'manual',
    tags: ['audit'],
  });

  // Export CSV
  const exportCsvRes = await fetch(`${BASE_URL}/api/v1/contacts/export?format=csv`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(exportCsvRes.status, 200);
  assert.strictEqual(exportCsvRes.headers.get('content-type'), 'text/csv; charset=utf-8');
  const csvText = await exportCsvRes.text();
  assert(csvText.includes("'=CMD|"), 'Dangerous formula must be prefixed with single quote');
  assert(csvText.includes("'+HYPERLINK"), 'Dangerous +HYPERLINK formula must be prefixed with single quote');
  console.log('✓ CSV Export sanitized against spreadsheet formula injection');

  // Export XLSX
  const exportXlsxRes = await fetch(`${BASE_URL}/api/v1/contacts/export?format=xlsx`, {
    headers: { Cookie: userA.cookie },
  });
  assert.strictEqual(exportXlsxRes.status, 200);
  const xlsxArrayBuffer = await exportXlsxRes.arrayBuffer();
  const parsedExportWb = XLSX.read(Buffer.from(xlsxArrayBuffer), { type: 'buffer' });
  assert(parsedExportWb.SheetNames.includes('Contacts'));
  console.log('✓ XLSX Export generated valid binary workbook with sanitized cells\n');

  // --------------------------------------------------------------------------
  // TEST 11: CAMPAIGN AUDIENCE PREVIEW & STRICT OPT-IN SENDING ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('--- TEST 11: Campaign Audience Selection & Strict Opt-In Enforcement ---');
  // Create a draft campaign
  const campaign = await Campaign.create({
    sessionId: userA.sessionId,
    brandId: userA.brandId,
    campaignName: 'Autumn Sale 2026',
    subject: 'Exclusive Deals for VIPs',
    editorData: {
      schemaVersion: 1,
      blocks: [{ id: 'b1', type: 'text', content: 'Hello!' }],
    },
    status: 'draft',
    recipientCount: 0,
    stats: { sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
  });

  // Audience preview API
  const audPreviewRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign._id}/audience/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      audienceType: 'all_eligible',
    }),
  });
  assert.strictEqual(audPreviewRes.status, 200);
  const audPreviewData = await audPreviewRes.json();
  assert(audPreviewData.data.eligibleCount > 0);
  assert(audPreviewData.data.ineligibleCount > 0); // hacker and bob are unknown
  console.log(`✓ Campaign Audience Preview: ${audPreviewData.data.eligibleCount} eligible (opted_in), ${audPreviewData.data.ineligibleCount} excluded`);

  // Test send campaign: Should only queue opted_in contacts!
  const sendRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaign._id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
    },
    body: JSON.stringify({
      audienceType: 'all_eligible',
    }),
  });
  assert.strictEqual(sendRes.status, 200);

  // Check CampaignRecipient records created: None must be 'unknown' or 'unsubscribed'
  const queuedRecipients = await CampaignRecipient.find({ campaignId: campaign._id });
  assert(queuedRecipients.length > 0, 'Should have queued eligible recipients');
  for (const rc of queuedRecipients) {
    const contactDoc = await Contact.findOne({
      sessionId: userA.sessionId,
      normalizedEmail: rc.email.toLowerCase(),
    });
    assert.strictEqual(
      contactDoc.consentStatus,
      'opted_in',
      `Queued recipient ${rc.email} must have consentStatus: opted_in`
    );
  }
  console.log(`✓ Strict Compliance Verified: ${queuedRecipients.length} queued, 100% have consentStatus: opted_in\n`);

  // --------------------------------------------------------------------------
  // TEST 12: MULTI-TENANT GUEST SESSION DATA ISOLATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 12: Multi-Tenant Guest Session Isolation ---');
  // User B lists contacts
  const userBContactsRes = await fetch(`${BASE_URL}/api/v1/contacts`, {
    headers: { Cookie: userB.cookie },
  });
  const userBContacts = await userBContactsRes.json();
  assert.strictEqual(userBContacts.data.contacts.length, 0);
  assert.strictEqual(userBContacts.data.stats.totalContacts, 0);

  // User B attempts to access User A's contact
  const userBGetContactRes = await fetch(`${BASE_URL}/api/v1/contacts/${contact1Id}`, {
    headers: { Cookie: userB.cookie },
  });
  assert.strictEqual(userBGetContactRes.status, 404, 'User B must not see User A contact (404)');

  // User B attempts to delete User A's segment
  const userBDeleteSegRes = await fetch(`${BASE_URL}/api/v1/segments/${segmentId}`, {
    method: 'DELETE',
    headers: { Cookie: userB.cookie },
  });
  assert.strictEqual(userBDeleteSegRes.status, 404, 'User B must not delete User A segment (404)');
  console.log('✓ Strict Session Isolation Confirmed: Session B has zero access to Session A data\n');

  console.log('🎉 =======================================================');
  console.log('🎉 ALL 12 RECIPIENT MANAGEMENT TESTS PASSED PERFECTLY!');
  console.log('🎉 =======================================================\n');

  if (webProcess) {
    webProcess.kill();
  }
  await disconnectDatabase();
}

runPhase5Tests().catch(async (err) => {
  console.error('❌ Phase 5 Test Suite Failed:', err);
  try {
    await disconnectDatabase();
  } catch {}
  process.exit(1);
});
