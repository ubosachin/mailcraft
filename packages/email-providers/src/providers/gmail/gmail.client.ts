import { QuotaExceededError, RateLimitError, ProviderError } from '../../errors/provider.errors.js';

export interface SendGmailMimeOptions {
  accessToken: string;
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export class GmailApiClient {
  /**
   * Constructs an RFC 2822 compliant MIME message and dispatches it via Gmail REST API.
   */
  async sendMessage(options: SendGmailMimeOptions): Promise<{ id: string; threadId: string }> {
    const boundary = `----=_mailcraft_mime_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fromHeader = options.fromName ? `"${options.fromName}" <${options.from}>` : options.from;

    const mimeLines = [
      `From: ${fromHeader}`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        mimeLines.push(`${k}: ${v}`);
      }
    }

    mimeLines.push('');
    mimeLines.push(`--${boundary}`);
    mimeLines.push('Content-Type: text/plain; charset=UTF-8');
    mimeLines.push('Content-Transfer-Encoding: 7bit');
    mimeLines.push('');
    mimeLines.push(options.text);
    mimeLines.push('');
    mimeLines.push(`--${boundary}`);
    mimeLines.push('Content-Type: text/html; charset=UTF-8');
    mimeLines.push('Content-Transfer-Encoding: 7bit');
    mimeLines.push('');
    mimeLines.push(options.html);
    mimeLines.push('');
    mimeLines.push(`--${boundary}--`);

    const rawMime = mimeLines.join('\r\n');
    const base64UrlMessage = Buffer.from(rawMime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64UrlMessage }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = JSON.stringify(err);

      if (res.status === 429) {
        throw new RateLimitError('gmail', 60);
      }
      if (res.status === 403 && errorMsg.includes('quotaExceeded')) {
        throw new QuotaExceededError('gmail', 'Gmail daily sending quota has been reached (max 500/day for consumer, 2000/day for Workspace)');
      }
      throw new ProviderError(
        `Gmail send failed (${res.status}): ${errorMsg}`,
        'gmail',
        res.status,
        'GMAIL_SEND_FAILED'
      );
    }

    const data = (await res.json()) as { id: string; threadId: string };
    return data;
  }
}
