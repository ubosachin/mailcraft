import { NextRequest, NextResponse } from 'next/server';
import { resolveGuestSession } from '@/lib/session';
import { jsonError, handleApiError } from '@/lib/api-response';
import { exportContactsBuffer } from '@/lib/contact-service';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';

    const queryOptions = {
      search: searchParams.get('search') || undefined,
      consentStatus: searchParams.get('consentStatus') || undefined,
      tag: searchParams.get('tag') || undefined,
      company: searchParams.get('company') || undefined,
      segmentId: searchParams.get('segmentId') || undefined,
    };

    const { buffer, filename, mimeType } = await exportContactsBuffer(
      session._id,
      format,
      queryOptions
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
