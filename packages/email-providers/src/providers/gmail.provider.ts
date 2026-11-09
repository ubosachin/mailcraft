import { IEmailProvider, SendEmailPayload, SendEmailResult } from '../types.js';

export interface GmailProviderOptions {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  senderEmail: string;
}

export class GmailProvider implements IEmailProvider {
  readonly providerType = 'gmail';
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private senderEmail: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(options: GmailProviderOptions) {
    this.refreshToken = options.refreshToken;
    this.clientId = options.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = options.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.senderEmail = options.senderEmail;
  }

  async connect(): Promise<void> {
    if (this.refreshToken.startsWith('mock_')) {
      return;
    }
    await this.refreshAccessToken();
  }

  async verifySender(): Promise<boolean> {
    return true;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    if (this.refreshToken.startsWith('mock_') || !this.clientId) {
      this.accessToken = 'mock_gmail_access_token';
      this.tokenExpiresAt = Date.now() + 3600000;
      return this.accessToken;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to refresh Gmail OAuth token: ${res.statusText}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    // If mock token or test credentials, simulate cleanly
    if (this.refreshToken.startsWith('mock_') || !this.clientId) {
      return {
        messageId: `<gmail-mock-${Date.now()}@mail.gmail.com>`,
        accepted: true,
        provider: 'gmail',
        rawResponse: { simulated: true },
      };
    }

    const token = await this.refreshAccessToken();

    // Construct raw MIME message
    const boundary = `====_mailcraft_boundary_${Date.now()}`;
    const from = payload.fromName ? `"${payload.fromName}" <${this.senderEmail}>` : this.senderEmail;

    const rawMessageLines = [
      `From: ${from}`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    if (payload.headers) {
      for (const [k, v] of Object.entries(payload.headers)) {
        rawMessageLines.push(`${k}: ${v}`);
      }
    }

    rawMessageLines.push('');
    rawMessageLines.push(`--${boundary}`);
    rawMessageLines.push('Content-Type: text/plain; charset=UTF-8');
    rawMessageLines.push('');
    rawMessageLines.push(payload.text);
    rawMessageLines.push('');
    rawMessageLines.push(`--${boundary}`);
    rawMessageLines.push('Content-Type: text/html; charset=UTF-8');
    rawMessageLines.push('');
    rawMessageLines.push(payload.html);
    rawMessageLines.push('');
    rawMessageLines.push(`--${boundary}--`);

    const rawMime = rawMessageLines.join('\r\n');
    const encoded = Buffer.from(rawMime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gmail API sending failed (${res.status}): ${JSON.stringify(err)}`);
    }

    const data = (await res.json()) as { id: string };

    return {
      messageId: `<gmail-${data.id}@mail.gmail.com>`,
      accepted: true,
      provider: 'gmail',
      rawResponse: data,
    };
  }

  async disconnect(): Promise<void> {
    this.accessToken = null;
  }
}

