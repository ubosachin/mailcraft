import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/health-checker';

export async function GET() {
  const readiness = await checkReadiness();
  return NextResponse.json(
    {
      status: readiness.ready ? 'healthy' : 'degraded',
      service: 'MailCraft API v1',
      database: (readiness.checks.mongodb as { status?: string })?.status || 'connected',
      timestamp: new Date().toISOString(),
      dependencies: readiness.checks,
      version: '1.0.0',
    },
    { status: readiness.ready ? 200 : 503 }
  );
}
