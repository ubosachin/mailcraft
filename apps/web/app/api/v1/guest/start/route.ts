import { jsonError } from '@/lib/api-response';

export async function POST() {
  return jsonError(
    'Guest mode has been disabled. Please sign up at /signup or log in at /login.',
    410
  );
}
