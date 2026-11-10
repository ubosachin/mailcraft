import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectToDatabase, ContactInquiry } from '@mailcraft/database';
import { BrevoProvider } from '@mailcraft/email-providers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

const contactInquirySchema = z.object({
  email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
  message: z
    .string()
    .trim()
    .min(5, 'Please include a short message (at least 5 characters)')
    .max(4000, 'Message must be under 4000 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = await checkRateLimit(`contact_inquiry:${ip}`, 'SESSION_CREATE');
    if (!rateLimit.success) {
      return jsonError('Too many inquiries submitted. Please wait a few minutes.', 429, {
        retryAfter: Math.ceil(rateLimit.resetMs / 1000),
      });
    }

    const body = await request.json();
    const validated = contactInquirySchema.parse(body);

    await connectToDatabase();

    let notifiedAdmin = false;
    const systemBrevoKey = process.env.SYSTEM_BREVO_API_KEY || process.env.BREVO_API_KEY;
    const adminEmail = process.env.SYSTEM_SENDER_EMAIL?.trim();

    if (systemBrevoKey && adminEmail) {
      try {
        const brevo = new BrevoProvider({
          apiKey: systemBrevoKey,
          defaultSenderEmail: adminEmail,
          defaultSenderName: 'MailCraft Support',
        });
        await brevo.sendEmail({
          to: adminEmail,
          from: adminEmail,
          fromName: 'MailCraft Contact Form',
          subject: `[MailCraft Support] Inquiry from ${validated.email}`,
          text: `From: ${validated.email}\nIP: ${ip}\n\n${validated.message}`,
          html: `<div style="font-family:sans-serif;max-width:560px;padding:20px;">
            <h3 style="margin:0 0 10px;color:#0f172a;">New Contact Inquiry</h3>
            <p style="font-size:13px;color:#475569;"><strong>From:</strong> ${validated.email}</p>
            <div style="margin-top:12px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap;font-size:13px;color:#1e293b;">${validated.message.replace(/</g, '&lt;')}</div>
          </div>`,
        });
        notifiedAdmin = true;
      } catch (notifyErr) {
        console.warn('[Contact] Support email notification failed (inquiry saved in DB):', notifyErr);
      }
    }

    const inquiry = await ContactInquiry.create({
      email: validated.email,
      message: validated.message,
      ipAddress: ip,
      notifiedAdmin,
      status: 'new',
    });

    return jsonSuccess(
      {
        id: inquiry._id.toString(),
        notifiedAdmin,
      },
      201,
      'Inquiry received successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

