import { signAwsRequest, AwsCredentials } from './ses.sigv4.js';
import {
  AuthenticationFailedError,
  RateLimitError,
  ProviderError,
} from '../../errors/provider.errors.js';

export interface SesAccountInfo {
  dedicatedIpAutoWarmupEnabled?: boolean;
  enforcementStatus?: string;
  productionAccessEnabled?: boolean;
  sendQuota?: {
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  };
  sendingEnabled?: boolean;
}

export interface SesIdentityInfo {
  identityType: 'EMAIL_ADDRESS' | 'DOMAIN';
  sendingEnabled: boolean;
  verificationStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'TEMPORARY_FAILURE' | 'NOT_STARTED';
  dkimAttributes?: {
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    tokens?: string[];
  };
}

export interface SendSesPayload {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export class AmazonSesClient {
  private creds: AwsCredentials;
  private endpoint: string;

  constructor(creds: AwsCredentials) {
    this.creds = creds;
    this.endpoint = `https://email.${creds.region}.amazonaws.com`;
  }

  private async request<T>(
    method: string,
    path: string,
    body: Record<string, unknown> | null = null
  ): Promise<T> {
    const url = new URL(`${this.endpoint}${path}`);
    const payloadStr = body ? JSON.stringify(body) : '';

    const baseHeaders: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };

    const signedHeaders = signAwsRequest(
      method,
      url,
      baseHeaders,
      payloadStr || null,
      this.creds,
      'email'
    );

    const res = await fetch(url.toString(), {
      method,
      headers: signedHeaders,
      body: payloadStr || undefined,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errStr = JSON.stringify(errJson);

      if (res.status === 403 || res.status === 401) {
        throw new AuthenticationFailedError('ses', `AWS SES authorization failed (${res.status}): ${errStr}`);
      }
      if (res.status === 429 || errStr.includes('TooManyRequestsException')) {
        throw new RateLimitError('ses', 30);
      }
      throw new ProviderError(
        `Amazon SES request to ${path} failed (${res.status}): ${errStr}`,
        'ses',
        res.status,
        'SES_API_ERROR'
      );
    }

    return (await res.json()) as T;
  }

  async getAccount(): Promise<SesAccountInfo> {
    return this.request('GET', '/v2/email/account');
  }

  async getEmailIdentity(identity: string): Promise<SesIdentityInfo> {
    const encoded = encodeURIComponent(identity);
    return this.request('GET', `/v2/email/identities/${encoded}`);
  }

  async sendEmail(payload: SendSesPayload): Promise<{ MessageId: string }> {
    const fromHeader = payload.fromName
      ? `"${payload.fromName}" <${payload.from}>`
      : payload.from;

    const emailBody = {
      FromEmailAddress: fromHeader,
      Destination: {
        ToAddresses: [payload.to],
      },
      Content: {
        Simple: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: payload.html, Charset: 'UTF-8' },
            Text: { Data: payload.text, Charset: 'UTF-8' },
          },
          Headers: payload.headers
            ? Object.entries(payload.headers).map(([Name, Value]) => ({ Name, Value }))
            : [],
        },
      },
    };

    return this.request('POST', '/v2/email/outbound-emails', emailBody);
  }
}
