import { NextRequest, NextResponse } from 'next/server';
import { recordClickEvent, isValidHttpUrl } from '@/lib/tracking-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

    if (!token) {
      return NextResponse.json({ error: 'Missing tracking token' }, { status: 400 });
    }

    const result = await recordClickEvent(token, { ip, userAgent });

    if (!result.success || !result.destinationUrl) {
      return NextResponse.json(
        { error: 'Tracking link expired or invalid' },
        { status: 404 }
      );
    }

    const destination = result.destinationUrl;
    if (!isValidHttpUrl(destination)) {
      return NextResponse.json(
        { error: 'Invalid destination URL' },
        { status: 400 }
      );
    }

    // Safe 302 redirect with no-store to prevent browser link caching
    return NextResponse.redirect(destination, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('[ClickTracking] Error processing redirect:', error);
    return NextResponse.json({ error: 'Failed to process tracking redirect' }, { status: 500 });
  }
}

