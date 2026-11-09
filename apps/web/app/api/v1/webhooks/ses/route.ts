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

    const raw = await request.text();
    let body: Record<string, unknown> = {};

    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError('Invalid JSON payload in SES webhook', 400);
    }

    // Handle AWS SNS SubscriptionConfirmation
    if (body.Type === 'SubscriptionConfirmation' && typeof body.SubscribeURL === 'string') {
      console.log('[SES Webhook] Auto-confirming SNS subscription via:', body.SubscribeURL);
      try {
        await fetch(body.SubscribeURL);
      } catch (err) {
        console.error('[SES Webhook] Error fetching SubscribeURL:', err);
      }
      return jsonSuccess({ confirmed: true, subscriptionConfirmed: true });
    }

    // Unpack SNS Message JSON wrapper if present
    let messageObj: Record<string, unknown> = body;
    if (typeof body.Message === 'string') {
      try {
        messageObj = JSON.parse(body.Message);
      } catch {
        // Not a JSON message string
      }
    }

    const notificationType = String(
      messageObj.notificationType || messageObj.eventType || ''
    ).toLowerCase();

    const mail = messageObj.mail as Record<string, unknown> | undefined;
    const messageId = (mail?.messageId as string) || (body.MessageId as string);
    const destinationList = (mail?.destination as string[]) || [];

    if (!notificationType) {
      return jsonSuccess({ acknowledged: true, note: 'No notificationType detected' });
    }

    let eventType: EmailEventType = 'delivered';
    let bounceReason = '';

    if (notificationType === 'delivery') {
      eventType = 'delivered';
    } else if (notificationType === 'bounce') {
      const bounce = messageObj.bounce as Record<string, unknown> | undefined;
      const bounceType = String(bounce?.bounceType || '').toLowerCase();
      if (bounceType === 'permanent') {
        eventType = 'hard_bounce';
      } else {
        eventType = 'soft_bounce';
      }
      bounceReason = String((bounce?.bouncedRecipients as any)?.[0]?.diagnosticCode || bounce?.bounceSubType || 'SES bounce');
    } else if (notificationType === 'complaint') {
      eventType = 'complaint';
      const complaint = messageObj.complaint as Record<string, unknown> | undefined;
      bounceReason = String(complaint?.complaintFeedbackType || 'Spam complaint');
    } else if (notificationType === 'send') {
      eventType = 'provider_accepted';
    } else if (notificationType === 'reject') {
      eventType = 'rejected';
    } else if (notificationType === 'open') {
      eventType = 'opened';
    } else if (notificationType === 'click') {
      eventType = 'clicked';
    }

    const email =
      (messageObj.bounce as any)?.bouncedRecipients?.[0]?.emailAddress ||
      (messageObj.complaint as any)?.complainedRecipients?.[0]?.emailAddress ||
      (destinationList[0] as string) ||
      '';

    const eventId = `${messageId}_${notificationType}_${body.MessageId || Date.now()}`;
    const timestamp = mail?.timestamp ? new Date(mail.timestamp as string) : new Date();

    const result = await processNormalizedWebhookEvent({
      provider: 'ses',
      eventId,
      providerMessageId: messageId,
      recipientEmail: email,
      eventType,
      eventTimestamp: timestamp,
      metadata: {
        notificationType,
        reason: bounceReason,
        source: mail?.source,
      },
      rawPayload: body,
      signatureValid: true,
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
