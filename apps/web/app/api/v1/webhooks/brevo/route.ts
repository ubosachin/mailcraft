import { NextRequest } from 'next/server';
import { processNormalizedWebhookEvent } from '@/lib/webhook-processor';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { EmailEventType } from '@mailcraft/shared-types';

export async function POST(request: NextRequest) {
  try {
    const rawHeaders: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      rawHeaders[k] = v;
    });

    // Verify webhook signature/key if configured
    const configuredSecret = process.env.BREVO_WEBHOOK_SECRET;
    const providedKey =
      request.headers.get('x-sib-webhook-key') ||
      request.headers.get('x-brevo-webhook-key') ||
      request.nextUrl.searchParams.get('secret');

    let signatureValid = true;
    if (configuredSecret) {
      if (!providedKey || providedKey !== configuredSecret) {
        signatureValid = false;
        return jsonError('Invalid Brevo webhook authentication key', 401);
      }
    }

    const body = await request.json();
    const eventRaw = String(body.event || body['event-type'] || '').toLowerCase();
    const email = String(body.email || '').toLowerCase().trim();
    const messageId = body['message-id'] || body.messageId;

    if (!email || !eventRaw) {
      return jsonError('Missing email or event type in Brevo webhook payload', 400);
    }

    // Map Brevo event types
    let eventType: EmailEventType = 'delivered';
    switch (eventRaw) {
      case 'delivered':
        eventType = 'delivered';
        break;
      case 'hard_bounce':
        eventType = 'hard_bounce';
        break;
      case 'soft_bounce':
        eventType = 'soft_bounce';
        break;
      case 'spam':
      case 'complaint':
        eventType = 'complaint';
        break;
      case 'unsubscribed':
        eventType = 'unsubscribed';
        break;
      case 'opened':
      case 'unique_opened':
        eventType = 'opened';
        break;
      case 'click':
      case 'clicked':
        eventType = 'clicked';
        break;
      case 'deferred':
        eventType = 'deferred';
        break;
      case 'blocked':
      case 'invalid_email':
        eventType = 'rejected';
        break;
      default:
        eventType = 'delivered';
    }

    const eventId =
      body.id?.toString() ||
      `${messageId || email}_${eventRaw}_${body.ts_event || body.date || Date.now()}`;

    const timestamp = body.ts_event
      ? new Date(Number(body.ts_event) * 1000)
      : body.date
      ? new Date(body.date)
      : new Date();

    const result = await processNormalizedWebhookEvent({
      provider: 'brevo',
      eventId,
      providerMessageId: messageId,
      recipientEmail: email,
      eventType,
      eventTimestamp: timestamp,
      metadata: {
        rawEvent: eventRaw,
        reason: body.reason,
        link: body.link,
        ip: body.ip,
        userAgent: body['user-agent'],
      },
      rawPayload: body,
      signatureValid,
      headers: rawHeaders,
    });

    return jsonSuccess({
      acknowledged: true,
      deduplicated: result.deduplicated || false,
      eventType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
