import { NextRequest, NextResponse } from 'next/server';
import { recordOpenEvent } from '@/lib/tracking-service';

// 1x1 transparent GIF binary
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

    // Log open event before returning 1x1 GIF
    if (token) {
      try {
        await recordOpenEvent(token, { ip, userAgent });
      } catch (err) {
        console.error('[OpenTracking] Failed to record open event:', err);
      }
    }

    return new NextResponse(TRANSPARENT_1X1_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': String(TRANSPARENT_1X1_GIF.length),
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('[OpenTracking] Error processing pixel:', error);
    return new NextResponse(TRANSPARENT_1X1_GIF, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}
