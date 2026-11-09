import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectToDatabase, EmailConnection } from '@mailcraft/database';
import { createProviderFromConnection } from '@mailcraft/email-providers';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const testEmailSchema = z.object({
  recipientEmail: z.string().trim().email('Please enter a valid recipient email address'),
  subject: z.string().trim().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const validated = testEmailSchema.parse(body);

    await connectToDatabase();

    const connection = await EmailConnection.findOne({
      _id: id,
      sessionId: session._id,
      status: { $ne: 'disconnected' },
    });

    if (!connection) {
      return jsonError('Email connection not found or access denied', 404);
    }

    if (connection.status === 'revoked' || connection.status === 'auth_failed') {
      return jsonError(
        'Email connection authentication has failed or was revoked. Please reconnect.',
        400
      );
    }

    const provider = createProviderFromConnection(connection, { allowPending: true });

    const subject =
      validated.subject ||
      `MailCraft Test Delivery: ${connection.provider.toUpperCase()} Connected`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .content { padding: 32px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #a7f3d0; }
    .details { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6; }
    .details strong { color: #334155; }
    .footer { border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>MailCraft Email Delivery Test</h1>
    </div>
    <div class="content">
      <div class="badge">&#10003; Delivery Pipeline Active</div>
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">Congratulations!</h2>
      <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.5;">
        Your email sending channel is correctly integrated and verified. Campaigns scheduled with MailCraft can now be delivered through your infrastructure.
      </p>
      <div class="details">
        <div><strong>Sending Provider:</strong> ${connection.provider.toUpperCase()}</div>
        <div><strong>Sender Address:</strong> ${connection.senderEmail}</div>
        <div><strong>Recipient:</strong> ${validated.recipientEmail}</div>
        <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
      </div>
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        This test message confirms end-to-end provider connectivity and MIME envelope generation.
      </p>
    </div>
    <div class="footer">
      Sent with MailCraft &bull; Professional Promotional Email Platform
    </div>
  </div>
</body>
</html>
`.trim();

    const text = `
MailCraft Email Delivery Test
---------------------------------
Sending Provider: ${connection.provider.toUpperCase()}
Sender Address: ${connection.senderEmail}
Recipient: ${validated.recipientEmail}
Timestamp: ${new Date().toUTCString()}

Congratulations! Your email sending channel is correctly integrated and verified.
Sent with MailCraft - Professional Promotional Email Platform.
`.trim();

    const result = await provider.sendEmail({
      to: validated.recipientEmail,
      from: connection.senderEmail,
      fromName: connection.senderName,
      subject,
      html,
      text,
    });

    return jsonSuccess(
      {
        success: true,
        messageId: result.messageId,
        provider: connection.provider,
        recipient: validated.recipientEmail,
        timestamp: new Date().toISOString(),
      },
      200,
      `Test email sent successfully to ${validated.recipientEmail}`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
