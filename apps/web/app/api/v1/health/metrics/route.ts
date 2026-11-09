import { NextResponse } from 'next/server';
import { getQueueMetrics, checkLiveness } from '@/lib/health-checker';

export async function GET() {
  try {
    const [queueMetrics, liveness] = await Promise.all([
      getQueueMetrics(),
      checkLiveness(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queues: queueMetrics,
        system: liveness,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to collect queue metrics',
      },
      { status: 500 }
    );
  }
}

