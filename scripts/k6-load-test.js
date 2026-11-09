import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Hold at 20 users
    { duration: '15s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.TEST_APP_URL || 'http://localhost:3000';

export default function () {
  // Scenario 1: Health Probes
  const healthRes = http.get(`${BASE_URL}/health/live`);
  check(healthRes, { 'health status is 200': (r) => r.status === 200 });

  // Scenario 2: Landing Page
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, { 'home page status is 200': (r) => r.status === 200 });

  // Scenario 3: Template Catalog API
  const templateRes = http.get(`${BASE_URL}/api/v1/templates`);
  check(templateRes, { 'templates status is 200': (r) => r.status === 200 });

  // Scenario 4: Email Authentication Guidelines
  const authRes = http.get(`${BASE_URL}/api/v1/settings/email-authentication`);
  check(authRes, { 'auth guidance status is 200': (r) => r.status === 200 });

  sleep(1);
}

