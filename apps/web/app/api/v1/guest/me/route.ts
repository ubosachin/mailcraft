import { jsonError } from '@/lib/api-response';

export async function GET() {
  return jsonError(
    'Guest mode has been disabled. Use /api/v1/auth/me with an authenticated user session.',
    410
  );
}
