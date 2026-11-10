import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Campaign, EmailEvent, Suppression } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonError, handleApiError } from '@/lib/api-response';

function sanitizeFormula(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (/^[=+@-|\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

function escapeCsvCell(cell: unknown): string {
  const sanitized = sanitizeFormula(cell);
  return `"${sanitized.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'events';
    const campaignId = searchParams.get('campaignId');

    await connectToDatabase();

    let csvLines: string[] = [];
    let filename = `mailcraft-analytics-${type}-${Date.now()}.csv`;

    if (type === 'campaigns') {
      const campaigns = await Campaign.find({ sessionId: session._id }).sort({ createdAt: -1 }).lean();
      const headers = [
        'Campaign ID',
        'Campaign Name',
        'Status',
        'Provider',
        'Subject',
        'Total Recipients',
        'Sent Count',
        'Delivered Count',
        'Bounced Count',
        'Failed Count',
        'Created At',
        'Launched At',
      ];
      csvLines.push(headers.map(escapeCsvCell).join(','));

      for (const c of campaigns) {
        csvLines.push(
          [
            c._id.toString(),
            c.campaignName,
            c.status,
            c.provider || '',
            c.subject,
            c.recipientCount || 0,
            (c.stats?.accepted || 0) + (c.stats?.failed || 0),
            c.stats?.delivered || 0,
            c.stats?.bounced || 0,
            c.stats?.failed || 0,
            c.createdAt ? new Date(c.createdAt).toISOString() : '',
            c.startedAt ? new Date(c.startedAt).toISOString() : '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    } else if (type === 'suppression') {
      const records = await Suppression.find({
        $or: [{ sessionId: session._id }, { scope: 'global' }],
      })
        .sort({ createdAt: -1 })
        .lean();

      const headers = ['Suppression ID', 'Email Hash', 'Reason', 'Scope', 'Source', 'Audit Reason', 'Added At'];
      csvLines.push(headers.map(escapeCsvCell).join(','));

      for (const s of records) {
        csvLines.push(
          [
            s._id.toString(),
            s.emailHash,
            s.reason,
            s.scope,
            s.metadata?.source || '',
            s.metadata?.notes || s.metadata?.reasonDetail || '',
            s.createdAt ? new Date(s.createdAt).toISOString() : '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    } else {
      // Default: 'events'
      const query: Record<string, unknown> = { sessionId: session._id };
      if (campaignId) {
        query.campaignId = campaignId;
      }

      const events = await EmailEvent.find(query)
        .sort({ eventTimestamp: -1 })
        .limit(5000)
        .lean();

      const headers = [
        'Event ID',
        'Campaign ID',
        'Event Type',
        'Provider',
        'Recipient Email',
        'Event Timestamp',
        'Destination URL',
        'Bounce Reason',
        'Is Bot',
      ];
      csvLines.push(headers.map(escapeCsvCell).join(','));

      for (const e of events) {
        csvLines.push(
          [
            e.eventId,
            e.campaignId?.toString() || '',
            e.eventType,
            e.provider,
            (e.metadata?.recipientEmail as string) || (e.metadata?.email as string) || '',
            e.eventTimestamp ? new Date(e.eventTimestamp).toISOString() : '',
            (e.metadata?.destinationUrl as string) || '',
            (e.metadata?.reason as string) || (e.metadata?.diagnosticCode as string) || '',
            e.metadata?.isBot ? 'true' : 'false',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }

    const csvContent = csvLines.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
