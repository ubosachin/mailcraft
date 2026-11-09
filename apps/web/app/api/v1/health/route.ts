import { NextResponse } from 'next/server';
import { connectToDatabase } from '@mailcraft/database';

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({
      status: 'healthy',
      service: 'MailCraft API',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'MailCraft API',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      { status: 503 }
    );
  }
}
