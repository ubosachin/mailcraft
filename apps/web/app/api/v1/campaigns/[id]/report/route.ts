import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Campaign, CampaignRecipient } from '@mailcraft/database';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

function sanitizeFormula(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (/^[=+@-|\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const filterType = searchParams.get('filter') === 'all' ? 'all' : 'failed_only';

    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    const query: Record<string, unknown> = { campaignId: campaign._id };
    if (filterType === 'failed_only') {
      query.status = { $in: ['bounced', 'failed', 'skipped', 'cancelled'] };
    }

    const recipients = await CampaignRecipient.find(query).sort({ updatedAt: -1 }).lean();

    if (format === 'csv') {
      const headers = ['Email', 'Status', 'Error Code', 'Error Message', 'Provider', 'Message ID', 'Sent At'];
      const rows = recipients.map((r) => [
        sanitizeFormula(r.email),
        sanitizeFormula(r.status),
        sanitizeFormula(r.errorCode || r.lastErrorCode || ''),
        sanitizeFormula(r.errorMessage || r.lastErrorMessage || ''),
        sanitizeFormula(r.provider || ''),
        sanitizeFormula(r.providerMessageId || ''),
        r.sentAt ? new Date(r.sentAt).toISOString() : '',
      ]);

      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
      }

      const csvContent = csvLines.join('\n');
      const filename = `campaign_${campaign.campaignName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${filterType}_report.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      campaignName: campaign.campaignName,
      filterType,
      totalCount: recipients.length,
      recipients: recipients.map((r) => ({
        id: r._id.toString(),
        email: r.email,
        status: r.status,
        errorCode: r.errorCode || r.lastErrorCode,
        errorMessage: r.errorMessage || r.lastErrorMessage,
        provider: r.provider,
        providerMessageId: r.providerMessageId,
        sentAt: r.sentAt?.toISOString(),
        deliveredAt: r.deliveredAt?.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
