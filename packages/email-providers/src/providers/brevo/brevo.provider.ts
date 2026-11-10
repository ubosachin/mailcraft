import {
  IEmailProvider,
  SendEmailPayload,
  SendEmailResult,
  ConnectionVerificationResult,
  SenderVerificationResult,
} from '../../types.js';
import { BrevoApiClient } from './brevo.client.js';
import { DnsRecordGuidance } from '@mailcraft/shared-types';

export interface BrevoProviderConfig {
  apiKey: string;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
}

export class BrevoProvider implements IEmailProvider {
  readonly providerType = 'brevo' as const;
  private apiKey: string;
  private defaultSenderEmail: string;
  private defaultSenderName: string;
  private client: BrevoApiClient;

  constructor(config: BrevoProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultSenderEmail = config.defaultSenderEmail || 'noreply@mailcraft.dev';
    this.defaultSenderName = config.defaultSenderName || 'MailCraft';
    this.client = new BrevoApiClient(this.apiKey);
  }

  async connect(): Promise<void> {
    await this.client.getAccount();
  }

  async verifyConnection(): Promise<ConnectionVerificationResult> {
    try {
      const account = await this.client.getAccount();
      const credits = account.plan?.reduce((acc, p) => acc + (p.credits || 0), 0) ?? 300;

      return {
        valid: true,
        provider: 'brevo',
        senderEmail: account.email,
        accountStatus: 'active',
        dailyQuotaRemaining: credits,
      };
    } catch (err: unknown) {
      return {
        valid: false,
        provider: 'brevo',
        error: err instanceof Error ? err.message : 'Invalid Brevo API key',
      };
    }
  }

  async verifySender(requestedSender?: string): Promise<SenderVerificationResult> {
    const emailToVerify = (requestedSender || this.defaultSenderEmail).toLowerCase().trim();
    const domain = emailToVerify.split('@')[1] || '';

    try {
      const sendersRes = await this.client.getSenders();
      const matched = sendersRes.senders?.find(
        (s) => s.email.toLowerCase() === emailToVerify && s.active
      );

      const domainsRes = await this.client.getDomains().catch(() => ({ domains: [] }));
      const matchedDomain = domainsRes.domains?.find((d) => d.domain_name === domain);

      const dnsRecords: DnsRecordGuidance[] = [];
      if (matchedDomain?.dns_records) {
        if (matchedDomain.dns_records.spf_record) {
          dnsRecords.push({
            type: 'TXT',
            name: matchedDomain.dns_records.spf_record.host_name,
            value: matchedDomain.dns_records.spf_record.value,
            status: matchedDomain.dns_records.spf_record.status ? 'verified' : 'pending',
            description: 'SPF authorization record',
          });
        }
        if (matchedDomain.dns_records.dkim_record) {
          dnsRecords.push({
            type: 'TXT',
            name: matchedDomain.dns_records.dkim_record.host_name,
            value: matchedDomain.dns_records.dkim_record.value,
            status: matchedDomain.dns_records.dkim_record.status ? 'verified' : 'pending',
            description: 'DKIM digital signature key',
          });
        }
      }

      const isDomainAuth = Boolean(matchedDomain?.authenticated);
      const isVerified = Boolean(matched);

      return {
        verified: isVerified,
        senderEmail: emailToVerify,
        domain,
        domainVerified: isDomainAuth,
        spfStatus: matchedDomain?.dns_records?.spf_record?.status ? 'verified' : 'pending',
        dkimStatus: matchedDomain?.dns_records?.dkim_record?.status ? 'verified' : 'pending',
        dmarcStatus: isDomainAuth ? 'verified' : 'unverified',
        dnsRecords,
        instructions: isVerified
          ? ['Sender email is approved in Brevo.']
          : [
              `Sender "${emailToVerify}" must be added to your Brevo Sendres & IPs dashboard.`,
              'Authenticate your sending domain via SPF and DKIM DNS records to maximize deliverability.',
            ],
      };
    } catch {
      return {
        verified: false,
        senderEmail: emailToVerify,
        domain,
        domainVerified: false,
        spfStatus: 'unverified',
        dkimStatus: 'unverified',
        instructions: [
          'Unable to verify sender status via Brevo API. Ensure API key has sender read permissions.',
        ],
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const res = await this.client.sendEmail({
      to: payload.to,
      fromEmail: payload.from || this.defaultSenderEmail,
      fromName: payload.fromName || this.defaultSenderName,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: payload.headers,
    });

    return {
      messageId: res.messageId || `<brevo-${Date.now()}@brevo.com>`,
      accepted: true,
      provider: 'brevo',
      rawResponse: res,
    };
  }

  async disconnect(): Promise<void> {
    // Stateless HTTP API
  }
}
