import { NextResponse } from 'next/server';
import { checkLiveness } from '@/lib/health-checker';

export async function GET() {
  const liveness = await checkLiveness();
  return NextResponse.json(liveness, { status: 200 });
}

