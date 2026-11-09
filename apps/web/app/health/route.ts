import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/health-checker';

export async function GET() {
  const readiness = await checkReadiness();
  const statusCode = readiness.ready ? 200 : 503;

  return NextResponse.json(
    {
      status: readiness.ready ? 'healthy' : 'degraded',
      service: 'MailCraft Web & API',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      dependencies: readiness.checks,
    },
    { status: statusCode }
  );
}

