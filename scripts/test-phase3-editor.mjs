import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { compileEmail } from '../packages/email-renderer/dist/index.js';
import { connectToDatabase, disconnectDatabase, Campaign, Brand } from '../packages/database/dist/index.js';

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

async function runPhase3Tests() {
  console.log('🚀 =======================================================');
  console.log('🚀 MAILCRAFT PHASE 3: ADVANCED EMAIL EDITOR TEST SUITE');
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
    console.log('Spawning Next.js server for Phase 3 tests...');
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
  // TEST 2: GUEST SESSION & BRAND INITIALIZATION
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Guest Session & Workspace Preparation ---');
  const sessionRes = await fetch(`${BASE_URL}/api/v1/guest/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: 'Velocita Cycles',
      senderEmail: 'founders@velocitacycles.com',
    }),
  });
  const sessionData = await sessionRes.json();
  assert.strictEqual(sessionRes.status, 201);
  const cookieHeader = sessionRes.headers.get('set-cookie')?.split(';')[0];
  assert(cookieHeader, 'HttpOnly session cookie required');
  console.log(`✓ Guest session initialized: ${sessionData.data.session.id}`);

  // Create Brand Profile
  const brandRes = await fetch(`${BASE_URL}/api/v1/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      brandName: 'Velocita Cycles',
      senderName: 'Marco Rossi',
      senderEmail: 'founders@velocitacycles.com',
      website: 'https://velocitacycles.com',
      footerAddress: '450 Via Roma, Turin, 10121 Italy',
      primaryColor: '#0284C7',
      secondaryColor: '#F59E0B',
    }),
  });
  const brandData = await brandRes.json();
  assert(brandRes.status === 200 || brandRes.status === 201, 'Brand setup must succeed with 200/201');
  const brandId = brandData.data.id;
  console.log(`✓ Brand profile established: ${brandId} ("Velocita Cycles")\n`);

  // --------------------------------------------------------------------------
  // TEST 3: IMAGE UPLOAD ENDPOINT (Cloudinary & Data URI Fallback)
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Image Upload Engine (/api/v1/upload/image) ---');
  // 1. Valid PNG upload
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([pngHeader], { type: 'image/png' }),
    'test-hero-image.png'
  );

  const uploadRes = await fetch(`${BASE_URL}/api/v1/upload/image`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadRes.status, 200);
  assert(uploadData.data?.url, 'Uploaded image must return a URL');
  assert.strictEqual(uploadData.data.mimeType, 'image/png');
  console.log(`✓ Image successfully uploaded and verified: ${uploadData.data.url.slice(0, 40)}... (${uploadData.data.size} bytes)`);

  // 2. Reject unsupported MIME type (e.g. text/plain)
  const badFormData = new FormData();
  badFormData.append(
    'file',
    new Blob(['Not an image'], { type: 'text/plain' }),
    'notes.txt'
  );

  const badUploadRes = await fetch(`${BASE_URL}/api/v1/upload/image`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
    },
    body: badFormData,
  });
  assert.strictEqual(badUploadRes.status, 400);
  console.log('✓ Correctly rejected invalid MIME type with 400 Bad Request\n');

  // --------------------------------------------------------------------------
  // TEST 4: CAMPAIGN CREATION & CLONING FROM TEMPLATE
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Campaign Lifecycle & Template Cloning ---');
  const cloneRes = await fetch(`${BASE_URL}/api/v1/templates/tech-launch/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      campaignName: 'Velocita Carbon Aero Flagship Launch',
    }),
  });
  const cloneData = await cloneRes.json();
  assert.strictEqual(cloneRes.status, 201);
  const campaignId = cloneData.data.campaignId;
  assert(campaignId, 'Cloned campaign must return campaignId');
  console.log(`✓ Cloned template "tech-launch" into campaign: ${campaignId}`);

  // Fetch campaign details via GET /api/v1/campaigns/:id
  const getCampRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}`, {
    headers: { Cookie: cookieHeader },
  });
  const getCampData = await getCampRes.json();
  assert.strictEqual(getCampRes.status, 200);
  assert.strictEqual(getCampData.data.id, campaignId);
  assert(getCampData.data.editorData?.blocks?.length >= 6, 'Template blocks must be loaded into campaign');
  console.log(`✓ Successfully loaded campaign data with ${getCampData.data.editorData.blocks.length} initial blocks\n`);

  // --------------------------------------------------------------------------
  // TEST 5: BLOCK EDITING, REORDERING, DUPLICATION & AUTOSAVE (PUT /api/v1/campaigns/:id)
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Advanced Block System & Autosave Persistence ---');

  // Construct updated editor schema exercising all new block types
  const updatedSchema = {
    templateId: 'tech-launch',
    version: 1,
    settings: {
      contentWidth: 620,
      backgroundColor: '#0F172A',
      background: '#0F172A',
      fontFamily: 'Inter, -apple-system, sans-serif',
      textColor: '#F8FAFC',
    },
    blocks: [
      {
        id: 'announcement-01',
        type: 'announcement_bar',
        props: {
          text: 'PRE-ORDER NOW: FIRST 50 GET COMPLIMENTARY CARBON CAGES',
          linkText: 'Claim Offer',
          linkUrl: 'https://velocitacycles.com/offer',
          backgroundColor: '#0284C7',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'logo-01',
        type: 'logo',
        props: {
          brandText: 'Velocita Cycles',
          width: 160,
          alignment: 'center',
          tagline: 'Pure Italian Racing Heritage',
        },
      },
      {
        id: 'hero-01',
        type: 'hero',
        props: {
          title: 'The New Aerostorm SLX Carbon',
          subtitle: 'Engineered in the wind tunnel to shave 14 watts at 45 km/h.',
          backgroundColor: '#1E293B',
          titleColor: '#38BDF8',
          subtitleColor: '#E2E8F0',
          ctaText: 'Explore Aero Features',
          ctaUrl: 'https://velocitacycles.com/aerostorm',
        },
      },
      {
        id: 'spacer-01',
        type: 'spacer',
        props: {
          height: 32,
          backgroundColor: 'transparent',
        },
      },
      {
        id: 'image-text-01',
        type: 'image_text',
        props: {
          heading: 'Wind-Tunnel Proven Geometry',
          text: 'Monocoque high-modulus carbon frame weighing just 780 grams.',
          imagePosition: 'left',
          imageSrc: uploadData.data.url,
          buttonText: 'View Specs',
          buttonUrl: 'https://velocitacycles.com/specs',
        },
      },
      {
        id: 'two-col-01',
        type: 'two_column',
        props: {
          col1Title: 'Electronic Shifting',
          col1Text: 'Full wireless integration with zero exposed cables.',
          col1LinkText: 'Drivetrain',
          col1Url: 'https://velocitacycles.com/drivetrain',
          col2Title: 'Tubeless Ready',
          col2Text: '50mm aero carbon wheels paired with 28mm race tires.',
          col2LinkText: 'Wheelset',
          col2Url: 'https://velocitacycles.com/wheels',
        },
      },
      {
        id: 'feature-sec-01',
        type: 'feature_section',
        props: {
          title: 'Built For The Podium',
          features: [
            { icon: '🏆', title: 'World Tour Tested', description: 'Raced across the mountain stages.' },
            { icon: '⚡', title: '14 Watts Faster', description: 'Confirmed by independent wind tunnel testing.' },
            { icon: '🛡', title: 'Lifetime Frame Warranty', description: 'Ride with uncompromising confidence.' },
          ],
        },
      },
      {
        id: 'coupon-01',
        type: 'coupon',
        props: {
          code: 'AERO2026',
          discount: '$500 OFF EARLY RESERVATIONS',
          description: 'Valid for the first 100 serial numbers through May 31.',
          backgroundColor: '#0369A1',
          borderColor: '#38BDF8',
        },
      },
      {
        id: 'footer-01',
        type: 'footer',
        props: {
          senderName: 'Velocita Cycles Racing Team',
          address: '450 Via Roma, Turin, 10121 Italy',
        },
      },
      {
        id: 'unsub-01',
        type: 'unsubscribe',
        props: {},
      },
    ],
  };

  // Perform Autosave PUT
  const putRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      campaignName: 'Velocita Aerostorm SLX Global Launch',
      subject: 'Introducing Aerostorm SLX: The Fastest Bike We Have Ever Engineered',
      preheader: 'Shave 14 watts at 45 km/h. Reserve serial #001 today.',
      editorData: updatedSchema,
    }),
  });
  const putData = await putRes.json();
  assert.strictEqual(putRes.status, 200);
  assert.strictEqual(putData.data.campaignName, 'Velocita Aerostorm SLX Global Launch');
  console.log('✓ Successfully saved updated campaign and editor schema via PUT /api/v1/campaigns/:id');

  // Verify persistence and recovery after simulated reload
  const reloadRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}`, {
    headers: { Cookie: cookieHeader },
  });
  const reloadData = await reloadRes.json();
  assert.strictEqual(reloadRes.status, 200);
  assert.strictEqual(reloadData.data.campaignName, 'Velocita Aerostorm SLX Global Launch');
  assert.strictEqual(reloadData.data.subject, 'Introducing Aerostorm SLX: The Fastest Bike We Have Ever Engineered');
  assert.strictEqual(reloadData.data.preheader, 'Shave 14 watts at 45 km/h. Reserve serial #001 today.');
  assert.strictEqual(reloadData.data.editorData.blocks.length, 10);
  console.log('✓ State recovery verified after reload (all 10 blocks, subject, and preheader preserved)\n');

  // --------------------------------------------------------------------------
  // TEST 6: SCHEMA VALIDATION ENDPOINT (/api/v1/email-renderer/validate)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Strict Schema Validation & Constraint Gating ---');
  const validCheck = await fetch(`${BASE_URL}/api/v1/email-renderer/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema: updatedSchema }),
  });
  const validCheckData = await validCheck.json();
  assert.strictEqual(validCheck.status, 200);
  assert.strictEqual(validCheckData.data.isValid, true);
  assert.strictEqual(validCheckData.data.blockCount, 10);
  console.log('✓ Schema validator accepted all 10 block types including new advanced blocks');

  // Gating invalid block type
  const invalidCheck = await fetch(`${BASE_URL}/api/v1/email-renderer/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: {
        blocks: [{ id: 'b-bad', type: 'unsupported_iframe_widget' }],
      },
    }),
  });
  assert.strictEqual(invalidCheck.status, 400);
  console.log('✓ Rejected forbidden/unknown block type with 400 Bad Request\n');

  // --------------------------------------------------------------------------
  // TEST 7: EMAIL COMPILATION & LIVE CAMPAIGN PREVIEW
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Server-Side Email Compilation & Live Campaign Preview ---');
  const renderRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
  });
  const renderData = await renderRes.json();
  assert.strictEqual(renderRes.status, 200);
  assert(renderData.data.html.includes('The New Aerostorm SLX Carbon'), 'HTML must contain hero title');
  assert(renderData.data.html.includes('PRE-ORDER NOW'), 'HTML must contain announcement bar text');
  assert(renderData.data.html.includes('AERO2026'), 'HTML must contain coupon code');
  assert(renderData.data.html.includes('Wind-Tunnel Proven Geometry'), 'HTML must contain image-text block');
  assert(renderData.data.html.includes('World Tour Tested'), 'HTML must contain feature section block');
  assert(renderData.data.html.includes('Electronic Shifting'), 'HTML must contain two-column block');
  assert(renderData.data.html.includes('<!--[if mso]>'), 'HTML must contain MSO conditional tables');
  assert(renderData.data.html.includes('unsubscribe'), 'HTML must include unsubscribe link');
  assert(renderData.data.text.includes('Aerostorm SLX'), 'Plain text must include campaign details');
  console.log(`✓ Campaign preview compiled successfully (${renderData.data.html.length} HTML bytes, ${renderData.data.text.length} text bytes)\n`);

  // --------------------------------------------------------------------------
  // TEST 8: TEST EMAIL DISPATCH (/api/v1/campaigns/:id/test)
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Test Email Dispatch Integration ---');
  const testRes = await fetch(`${BASE_URL}/api/v1/campaigns/${campaignId}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      testEmail: 'qa-review@velocitacycles.com',
    }),
  });
  const testData = await testRes.json();
  assert.strictEqual(testRes.status, 200);
  assert(testData.data?.jobId, 'Test email dispatch must queue BullMQ job');
  assert.strictEqual(testData.data.testEmail, 'qa-review@velocitacycles.com');
  console.log(`✓ Real test email dispatched & queued via BullMQ: Job ${testData.data.jobId} to ${testData.data.testEmail}\n`);

  // --------------------------------------------------------------------------
  // TEST 9: CAMPAIGN UNAVAILABLE / ERROR STATE HANDLING
  // --------------------------------------------------------------------------
  console.log('--- TEST 8: Robust Error State Handling for Unavailable Campaigns ---');
  const invalidCampRes = await fetch(`${BASE_URL}/api/v1/campaigns/000000000000000000000000`, {
    headers: { Cookie: cookieHeader },
  });
  assert.strictEqual(invalidCampRes.status, 404);
  const invalidCampData = await invalidCampRes.json();
  assert.strictEqual(invalidCampData.error, 'Campaign not found');
  console.log('✓ Handled missing campaign gracefully with 404 and structured message\n');

  console.log('======================================================');
  console.log('🎉 ALL PHASE 3 ADVANCED EMAIL EDITOR TESTS PASSED 100%!');
  console.log('======================================================\n');

  if (webProcess) {
    webProcess.kill('SIGTERM');
  }
  await disconnectDatabase();
  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Phase 3 Test Failed:', err);
  process.exit(1);
});

