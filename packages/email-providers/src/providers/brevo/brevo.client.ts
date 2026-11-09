import { AuthenticationFailedError, RateLimitError, ProviderError } from '../../errors/provider.errors.js';

export interface BrevoSender {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

export interface BrevoDomainRecord {
  domain_name: string;
  authenticated: boolean;
  verified: boolean;
  dns_records?: {
    dkim_record?: { value: string; host_name: string; status: boolean };
    spf_record?: { value: string; host_name: string; status: boolean };
    brevo_code?: { value: string; host_name: string; status: boolean };
  };
}

export interface SendBrevoPayload {
  to: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export class BrevoApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.brevo.com/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errText = JSON.stringify(err);

      if (res.status === 401 || res.status === 403) {
        throw new AuthenticationFailedError('brevo', `Brevo API authentication failed (${res.status}): ${errText}`);
      }
      if (res.status === 429) {
        throw new RateLimitError('brevo', 30);
      }
      throw new ProviderError(
        `Brevo API request to ${path} failed (${res.status}): ${errText}`,
        'brevo',
        res.status,
        'BREVO_API_ERROR'
      );
    }

    return (await res.json()) as T;
  }

  async getAccount(): Promise<{ email: string; firstName?: string; plan: Array<{ type: string; credits: number }> }> {
    return this.request('/account');
  }

  async getSenders(): Promise<{ senders: BrevoSender[] }> {
    return this.request('/senders');
  }

  async getDomains(): Promise<{ domains: BrevoDomainRecord[] }> {
    return this.request('/senders/domains');
  }

  async sendEmail(payload: SendBrevoPayload): Promise<{ messageId: string }> {
    const body = {
      sender: {
        name: payload.fromName || 'MailCraft Sender',
        email: payload.fromEmail,
      },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
      textContent: payload.text,
      headers: payload.headers || {},
    };

    return this.request('/smtp/email', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
