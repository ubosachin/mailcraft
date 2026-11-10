import { jsonError } from '@/lib/api-response';

export async function POST() {
  return jsonError(
    'Guest mode has been disabled. Please authenticate as a registered user.',
    410
  );
}
