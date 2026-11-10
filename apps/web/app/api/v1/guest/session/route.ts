import { jsonError } from '@/lib/api-response';

export async function DELETE() {
  return jsonError(
    'Guest mode has been disabled. Use /api/v1/auth/logout instead.',
    410
  );
}
