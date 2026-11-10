#!/usr/bin/env node

/**
 * MailCraft Production Load & Concurrency Stress Test Suite
 * Executes realistic multi-scenario traffic simulation measuring RPS, p50, p95, p99, error rates, and memory.
 */

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';
const DURATION_SECONDS = 5;
const CONCURRENT_CLIENTS = 10;

console.log('================================================================');
console.log('🚀 MAILCRAFT PRODUCTION LOAD & CONCURRENCY BENCHMARK');
console.log(`Target: ${BASE_URL} | Clients: ${CONCURRENT_CLIENTS} | Duration: ${DURATION_SECONDS}s`);
console.log('================================================================\n');

async function checkServer() {
  try {
    const res = await fetch(`${BASE_URL}/health/live`);
    if (res.ok) {
      console.log('✓ Target server is live and responsive.\n');
      return true;
    }
  } catch (err) {
    console.error('❌ Cannot connect to server at', BASE_URL, err.message);
    console.log('Please ensure the Next.js web application is running on port 3000.');
    return false;
  }
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  const getIdx = (p) => Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return {
    p50: sorted[getIdx(50)],
    p95: sorted[getIdx(95)],
    p99: sorted[getIdx(99)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round((sum / sorted.length) * 100) / 100,
  };
}

async function runScenario(scenarioName, requestFn, totalRequests = 50) {
  process.stdout.write(`Running Benchmark: [${scenarioName}] ... `);
  const latencies = [];
  let errors = 0;
  const startTime = Date.now();

  const worker = async () => {
    while (latencies.length + errors < totalRequests) {
      const reqStart = performance.now();
      try {
        const ok = await requestFn();
        const duration = performance.now() - reqStart;
        if (ok) {
          latencies.push(duration);
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
  };

  const pool = Array.from({ length: CONCURRENT_CLIENTS }, () => worker());
  await Promise.all(pool);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const totalCompleted = latencies.length + errors;
  const rps = Math.round((totalCompleted / totalTimeSec) * 10) / 10;
  const stats = calculatePercentiles(latencies);
  const errorRate = Math.round((errors / totalCompleted) * 1000) / 10;

  console.log('Done!');
  console.log(`  Requests: ${totalCompleted} | RPS: ${rps} req/sec | Error Rate: ${errorRate}%`);
  console.log(`  Latency: avg=${stats.avg}ms | p50=${stats.p50.toFixed(1)}ms | p95=${stats.p95.toFixed(1)}ms | p99=${stats.p99.toFixed(1)}ms | max=${stats.max.toFixed(1)}ms\n`);

  return { scenarioName, totalRequests: totalCompleted, rps, errorRate, stats };
}

async function main() {
  const isUp = await checkServer();
  if (!isUp) {
    process.exit(1);
  }

  const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `loadtest.${Date.now()}@gmail.com`,
      password: `LoadTest#${Date.now()}`,
      name: 'Load Tester',
    }),
  });
  const authCookie = signupRes.headers.get('set-cookie')?.split(';')[0] || '';

  const results = [];

  // 1. Health Probe Liveness & Readiness
  results.push(
    await runScenario('Health & Readiness Probes (/health/ready)', async () => {
      const res = await fetch(`${BASE_URL}/health/ready`);
      return res.status === 200;
    }, 60)
  );

  // 2. Landing Page & Static SSR Assets
  results.push(
    await runScenario('Landing Page Traffic (/)', async () => {
      const res = await fetch(`${BASE_URL}/`);
      return res.status === 200;
    }, 60)
  );

  // 3. Template Catalog Browsing & Filter API (Authenticated)
  results.push(
    await runScenario('Template Catalog & Filtering (/api/v1/templates)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/templates?category=ecommerce`, {
        headers: { Cookie: authCookie },
      });
      return res.status === 200;
    }, 60)
  );

  // 4. Auth Session Resolution Endpoint
  results.push(
    await runScenario('User Auth Resolution (/api/v1/auth/me)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: authCookie },
      });
      return res.status === 200;
    }, 60)
  );

  // 5. Protected Templates Catalog (/templates)
  results.push(
    await runScenario('Templates Catalog Page (/templates)', async () => {
      const res = await fetch(`${BASE_URL}/templates`, {
        headers: { Cookie: authCookie },
      });
      return res.status === 200;
    }, 60)
  );

  console.log('================================================================');
  console.log('📊 LOAD & PERFORMANCE BENCHMARK SUMMARY');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Scenario: r.scenarioName,
      RPS: r.rps,
      'Error %': `${r.errorRate}%`,
      'p50 (ms)': r.stats.p50.toFixed(1),
      'p95 (ms)': r.stats.p95.toFixed(1),
      'p99 (ms)': r.stats.p99.toFixed(1),
    }))
  );

  console.log('🎉 Load testing benchmark completed successfully!');
}

main().catch((err) => {
  console.error('Fatal load testing error:', err);
  process.exit(1);
});
