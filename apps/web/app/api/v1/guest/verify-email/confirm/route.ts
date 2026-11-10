import { jsonError } from '@/lib/api-response';

export async function POST() {
  return jsonError(
    'Guest endpoint retired. Use /api/v1/account/verify-email/confirm with an authenticated account.',
    410
  );
}
