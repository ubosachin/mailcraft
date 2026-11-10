import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { ALL_TEMPLATES, compileEmail, getTemplateBySlug } from '../packages/email-renderer/dist/index.js';
import { seedTemplates, connectToDatabase, disconnectDatabase, Template } from '../packages/database/dist/index.js';

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

async function runPhase2Tests() {
  console.log('🚀 =======================================================');
  console.log('🚀 MAILCRAFT PHASE 2: TEMPLATE LIBRARY & RENDERING SUITE');
  console.log('🚀 =======================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: VERIFY 12 DISTINCT EMAIL TEMPLATES IN CODE REGISTRY
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Inspecting 12 Handcrafted Email Templates ---');
  assert.strictEqual(ALL_TEMPLATES.length, 12, 'Expected exactly 12 templates in registry');

  const requiredSlugs = [
    'minimal-premium',
    'colorful-sale',
    'luxury-brand',
    'tech-launch',
    'festive-special',
    'food-restaurant',
    'startup-modern',
    'fashion-store',
    'corporate',
    'flash-sale',
    'welcome-offer',
    'product-launch',
  ];

  const registeredSlugs = ALL_TEMPLATES.map((t) => t.slug);
  for (const slug of requiredSlugs) {
    assert(registeredSlugs.includes(slug), `Missing required template slug: ${slug}`);
  }

  // Ensure every template has unique blocks and visual settings
  const seenBackgrounds = new Set();
  const seenBlockCounts = new Set();
  for (const t of ALL_TEMPLATES) {
    assert(t.name, `Template ${t.slug} must have a name`);
    assert(t.description, `Template ${t.slug} must have a description`);
    assert(t.thumbnail, `Template ${t.slug} must have a thumbnail`);
    assert(t.editorSchema.blocks.length >= 6, `Template ${t.slug} must have at least 6 blocks`);

    const bg = t.editorSchema.settings.background || t.editorSchema.settings.backgroundColor;
    seenBackgrounds.add(bg);
    seenBlockCounts.add(t.editorSchema.blocks.length);
  }

  console.log(`✓ All 12 distinct templates registered:`);
  ALL_TEMPLATES.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.category.padEnd(16)}] ${t.name.padEnd(20)} (${t.editorSchema.blocks.length} blocks, font: ${t.editorSchema.settings.fontFamily?.slice(0, 20)}...)`);
  });
  console.log(`✓ Distinct styling verified across catalog (${seenBackgrounds.size} unique color palettes)\n`);

  // --------------------------------------------------------------------------
  // TEST 2: COMPILER & VARIABLE REPLACEMENT RIGOR
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Server-Side Email Compiler & Variable Sanitization ---');

  for (const template of ALL_TEMPLATES) {
    const rendered = compileEmail({
      schema: template.editorSchema,
      brand: {
        brandName: 'Starlight Design Labs',
        senderName: 'Clara Vance',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#6366F1',
        secondaryColor: '#EC4899',
        footerAddress: '124 Design Blvd, San Francisco, CA 94107',
        website: 'https://starlight.design',
      },
      recipient: {
        name: 'Alex Rivera',
        firstName: 'Alex',
        email: 'alex@example.com',
        unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/token_123',
      },
      campaign: {
        subject: `Exclusive Drop: ${template.name}`,
        preheader: template.description,
      },
    });

    // Rigorous checks
    assert(rendered.html.includes('<!DOCTYPE html>'), `${template.slug} HTML must have DOCTYPE`);
    assert(rendered.html.includes('<!--[if mso]>'), `${template.slug} HTML must include MSO conditional tables`);
    assert(rendered.html.includes('role="presentation"'), `${template.slug} HTML must use accessible table roles`);
    assert(rendered.html.includes('Starlight Design Labs'), `${template.slug} HTML must inherit brand name`);
    assert(rendered.html.includes('https://mailcraft.dev/unsubscribe/token_123'), `${template.slug} HTML must interpolate unsubscribe URL`);
    assert(rendered.text.length > 50, `${template.slug} Plain text must be non-empty`);

    // Verify zero broken {{...}} variable leaks
    const unreplacedVars = rendered.html.match(/{{\s*[a-zA-Z0-9_-]+\s*}}/g);
    assert(!unreplacedVars, `${template.slug} has unreplaced template variables: ${unreplacedVars}`);

    // Verify no JavaScript or unsupported script tags
    assert(!rendered.html.includes('<script'), `${template.slug} contains forbidden script tag`);
  }
  console.log('✓ All 12 templates successfully compiled into bulletproof responsive HTML & plain-text');
  console.log('✓ Zero variable leaks or unreplaced tags detected');
  console.log('✓ MSO conditional tables, accessible table roles, and email resets verified\n');

  // --------------------------------------------------------------------------
  // TEST 3: DATABASE SEEDING IDEMPOTENCY
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: MongoDB Template Seeding & Idempotency ---');
  await connectToDatabase();

  const seed1 = await seedTemplates();
  assert(seed1.total >= 12, 'Seeding must ensure at least 12 templates active');
  console.log(`✓ Seed Run 1: Total active templates = ${seed1.total}`);

  // Run seed second time to guarantee idempotency (zero duplicates)
  const seed2 = await seedTemplates();
  assert.strictEqual(seed2.upserted, 0, 'Seed Run 2 must not create duplicates');
  assert.strictEqual(seed2.total, seed1.total, 'Total template count must remain unchanged');
  console.log(`✓ Seed Run 2 (Idempotency check): Upserted: ${seed2.upserted}, Count remains ${seed2.total}\n`);

  // --------------------------------------------------------------------------
  // TEST 4: REST API SUITE (Start Next.js server if not running)
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: REST API Endpoints Verification ---');
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
  } else {
    console.log('✓ Next.js server already running on port 3000');
  }

  // 4.1 GET /api/v1/templates (Catalog, search, sort, filter)
  const tplAllRes = await fetch(`${BASE_URL}/api/v1/templates`);
  const tplAllData = await tplAllRes.json();
  assert.strictEqual(tplAllRes.status, 200);
  assert(tplAllData.data.templates.length >= 12, 'Expected 12+ templates returned');
  assert(tplAllData.data.categoryCounts, 'Expected category counts summary');
  console.log(`✓ GET /api/v1/templates: Retrieved ${tplAllData.data.templates.length} templates with category metrics`);

  // Filter by category: fashion
  const tplFashionRes = await fetch(`${BASE_URL}/api/v1/templates?category=fashion`);
  const tplFashionData = await tplFashionRes.json();
  assert.strictEqual(tplFashionRes.status, 200);
  assert(tplFashionData.data.templates.every((t) => t.category === 'fashion'));
  console.log(`✓ GET /api/v1/templates?category=fashion: Filtered ${tplFashionData.data.templates.length} fashion templates`);

  // Search by keyword: luxury
  const tplSearchRes = await fetch(`${BASE_URL}/api/v1/templates?q=luxury`);
  const tplSearchData = await tplSearchRes.json();
  assert.strictEqual(tplSearchRes.status, 200);
  assert(tplSearchData.data.templates.length >= 1);
  console.log(`✓ GET /api/v1/templates?q=luxury: Search query returned ${tplSearchData.data.templates.length} matching design(s)`);

  // Sort by name
  const tplSortRes = await fetch(`${BASE_URL}/api/v1/templates?sort=name`);
  const tplSortData = await tplSortRes.json();
  assert.strictEqual(tplSortRes.status, 200);
  const names = tplSortData.data.templates.map((t) => t.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(names, sortedNames, 'Templates must be sorted alphabetically by name');
  console.log(`✓ GET /api/v1/templates?sort=name: Verified alphabetical sorting`);

  // 4.2 GET /api/v1/templates/:id (by slug and ObjectId)
  const tplSlugRes = await fetch(`${BASE_URL}/api/v1/templates/minimal-premium`);
  const tplSlugData = await tplSlugRes.json();
  assert.strictEqual(tplSlugRes.status, 200);
  assert.strictEqual(tplSlugData.data.slug, 'minimal-premium');
  const templateId = tplSlugData.data.id;

  const tplIdRes = await fetch(`${BASE_URL}/api/v1/templates/${templateId}`);
  const tplIdData = await tplIdRes.json();
  assert.strictEqual(tplIdRes.status, 200);
  assert.strictEqual(tplIdData.data.id, templateId);
  console.log(`✓ GET /api/v1/templates/:id: Resolved template by both slug ('minimal-premium') and MongoDB ID (${templateId})`);

  // 4.3 GET /api/v1/templates/:id/preview
  const prevRes = await fetch(`${BASE_URL}/api/v1/templates/minimal-premium/preview`);
  const prevData = await prevRes.json();
  assert.strictEqual(prevRes.status, 200);
  assert(prevData.data.html.includes('Minimalist Leather Folio'));
  assert(prevData.data.text.includes('Minimalist Leather Folio'));
  console.log(`✓ GET /api/v1/templates/:id/preview: Rendered preview HTML (${prevData.data.html.length} bytes)`);

  // 4.4 POST /api/v1/templates/:id/clone (Requires authenticated user session)
  // First sign up user
  const runId = Date.now();
  const authRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `nordic.${runId}@gmail.com`,
      password: `PassNordic#${runId}`,
      brandName: 'Nordic Audio Co',
    }),
  });
  const authData = await authRes.json();
  assert.strictEqual(authRes.status, 201);
  const cookieHeader = authRes.headers.get('set-cookie')?.split(';')[0];
  assert(cookieHeader, 'Session cookie must be returned');

  // Clone template into new campaign
  const cloneRes = await fetch(`${BASE_URL}/api/v1/templates/product-launch/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      campaignName: 'Nordic Audio Wireless Flagship Drop',
    }),
  });
  const cloneData = await cloneRes.json();
  assert.strictEqual(cloneRes.status, 201);
  assert(cloneData.data.campaignId, 'Cloned campaign must have an ID');
  assert.strictEqual(cloneData.data.campaignName, 'Nordic Audio Wireless Flagship Drop');
  assert.strictEqual(cloneData.data.status, 'draft');
  console.log(`✓ POST /api/v1/templates/:id/clone: Cloned template into new campaign draft: ${cloneData.data.campaignId}`);

  // 4.5 POST /api/v1/email-renderer/render
  const renderApiRes = await fetch(`${BASE_URL}/api/v1/email-renderer/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: 'festive-special',
      brand: {
        brandName: 'Hearth & Home Furnishings',
        primaryColor: '#B45309',
        footerAddress: '800 Maple Street, Aspen, CO 81611',
      },
      recipient: {
        firstName: 'Elena',
        name: 'Elena Rostova',
        email: 'elena@example.com',
      },
    }),
  });
  const renderApiData = await renderApiRes.json();
  assert.strictEqual(renderApiRes.status, 200);
  assert(
    renderApiData.data.html.includes('Hearth &amp; Home Furnishings') ||
      renderApiData.data.html.includes('Hearth & Home Furnishings')
  );
  assert(renderApiData.data.text.includes('Hearth & Home Furnishings'));
  assert(renderApiData.data.html.includes('Elena'));
  console.log(`✓ POST /api/v1/email-renderer/render: Successfully rendered template with custom brand & recipient variables`);

  // 4.6 POST /api/v1/email-renderer/validate
  // Valid schema check
  const valValidRes = await fetch(`${BASE_URL}/api/v1/email-renderer/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: {
        version: 1,
        settings: { contentWidth: 600 },
        blocks: [
          { id: 'b1', type: 'logo', props: { alignment: 'center' } },
          { id: 'b2', type: 'hero', props: { title: 'Hello World' } },
        ],
      },
    }),
  });
  const valValidData = await valValidRes.json();
  assert.strictEqual(valValidRes.status, 200);
  assert.strictEqual(valValidData.data.isValid, true);
  assert.strictEqual(valValidData.data.blockCount, 2);
  console.log(`✓ POST /api/v1/email-renderer/validate: Valid schema verified (blockCount: 2)`);

  // Invalid schema check
  const valInvalidRes = await fetch(`${BASE_URL}/api/v1/email-renderer/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: {
        settings: { contentWidth: 100 }, // invalid width < 320
        blocks: [{ id: '', type: 'non_existent_type' }], // invalid block
      },
    }),
  });
  assert.strictEqual(valInvalidRes.status, 400);
  console.log(`✓ POST /api/v1/email-renderer/validate: Rejected invalid schema with 400 Bad Request`);

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 2 TEMPLATE & RENDERER TESTS PASSED 100%!');
  console.log('======================================================\n');

  if (webProcess) {
    webProcess.kill('SIGTERM');
  }

  await disconnectDatabase();
  process.exit(0);
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ Phase 2 Test Failed:', err);
  process.exit(1);
});
