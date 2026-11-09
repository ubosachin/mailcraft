import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/health-checker';

export async function GET() {
  const readiness = await checkReadiness();
  return NextResponse.json(readiness, {
    status: readiness.ready ? 200 : 503,
  });
}

