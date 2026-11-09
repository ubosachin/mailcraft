import { IEmailProvider, SendEmailPayload, SendEmailResult } from '../types.js';

export interface BrevoProviderOptions {
  apiKey: string;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
}

export class BrevoProvider implements IEmailProvider {
  readonly providerType = 'brevo';
  private apiKey: string;
  private defaultSenderEmail: string;
  private defaultSenderName: string;

  constructor(options: BrevoProviderOptions) {
    this.apiKey = options.apiKey;
    this.defaultSenderEmail = options.defaultSenderEmail || 'noreply@mailcraft.dev';
    this.defaultSenderName = options.defaultSenderName || 'MailCraft';
  }

  async connect(): Promise<void> {
    // In production, can ping /v3/account to verify key
  }

  async verifySender(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    // If mock or offline key provided, simulate sending without throwing external network error
    if (this.apiKey.startsWith('mock_') || this.apiKey === 'xkeysib-test-brevo-key-999') {
      return {
        messageId: `<brevo-mock-${Date.now()}@brevo.com>`,
        accepted: true,
        provider: 'brevo',
        rawResponse: { simulated: true },
      };
    }

    const senderEmail = payload.from || this.defaultSenderEmail;
    const senderName = payload.fromName || this.defaultSenderName;

    const body = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
      headers: payload.headers || {},
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(
        `Brevo API error (${res.status}): ${JSON.stringify(errJson)}`
      );
    }

    const data = (await res.json()) as { messageId?: string };

    return {
      messageId: data.messageId || `<brevo-${Date.now()}@brevo.com>`,
      accepted: true,
      provider: 'brevo',
      rawResponse: data,
    };
  }

  async disconnect(): Promise<void> {
    // No-op for HTTP client
  }
}

