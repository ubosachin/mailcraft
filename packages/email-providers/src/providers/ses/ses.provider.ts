import {
  IEmailProvider,
  SendEmailPayload,
  SendEmailResult,
  ConnectionVerificationResult,
  SenderVerificationResult,
} from '../../types.js';
import { AmazonSesClient } from './ses.client.js';
import { AwsCredentials } from './ses.sigv4.js';
import { DnsRecordGuidance } from '@mailcraft/shared-types';

export interface SesProviderConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
}

export class SesProvider implements IEmailProvider {
  readonly providerType = 'ses' as const;
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private defaultSenderEmail: string;
  private defaultSenderName: string;
  private client: AmazonSesClient;

  constructor(config: SesProviderConfig) {
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.defaultSenderEmail = config.defaultSenderEmail || 'noreply@mailcraft.dev';
    this.defaultSenderName = config.defaultSenderName || 'MailCraft';

    const creds: AwsCredentials = {
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: config.sessionToken,
      region: this.region,
    };
    this.client = new AmazonSesClient(creds);
  }

  async connect(): Promise<void> {
    await this.client.getAccount();
  }

  async verifyConnection(): Promise<ConnectionVerificationResult> {
    try {
      const account = await this.client.getAccount();
      const quota = account.sendQuota;
      const remaining = quota ? Math.max(0, quota.max24HourSend - quota.sentLast24Hours) : 200;

      return {
        valid: true,
        provider: 'ses',
        senderEmail: this.defaultSenderEmail,
        accountStatus: account.productionAccessEnabled ? 'production' : 'sandbox',
        dailyQuotaRemaining: remaining,
      };
    } catch (err: unknown) {
      return {
        valid: false,
        provider: 'ses',
        error: err instanceof Error ? err.message : 'Failed to authenticate AWS SES credentials',
      };
    }
  }

  async verifySender(requestedSender?: string): Promise<SenderVerificationResult> {
    const emailToVerify = (requestedSender || this.defaultSenderEmail).toLowerCase().trim();
    const domain = emailToVerify.split('@')[1] || '';

    try {
      // First check domain identity
      const domainInfo = await this.client.getEmailIdentity(domain).catch(() => null);
      const emailInfo = domainInfo ? null : await this.client.getEmailIdentity(emailToVerify).catch(() => null);

      const targetInfo = domainInfo || emailInfo;
      const isVerified = targetInfo?.verificationStatus === 'SUCCESS';
      const dkimSuccess = targetInfo?.dkimAttributes?.status === 'SUCCESS';

      const dnsRecords: DnsRecordGuidance[] = [];
      if (domainInfo?.dkimAttributes?.tokens) {
        domainInfo.dkimAttributes.tokens.forEach((t, i) => {
          dnsRecords.push({
            type: 'CNAME',
            name: `${t}._domainkey.${domain}`,
            value: `${t}.dkim.amazonses.com`,
            status: dkimSuccess ? 'verified' : 'pending',
            description: `Amazon SES DKIM Token ${i + 1}`,
          });
        });
      }

      dnsRecords.push({
        type: 'TXT',
        name: domain,
        value: 'v=spf1 include:amazonses.com ~all',
        status: isVerified ? 'verified' : 'pending',
        description: 'SPF Authorization for Amazon SES',
      });

      return {
        verified: isVerified,
        senderEmail: emailToVerify,
        domain,
        domainVerified: isVerified,
        spfStatus: isVerified ? 'verified' : 'pending',
        dkimStatus: dkimSuccess ? 'verified' : 'pending',
        dmarcStatus: isVerified && dkimSuccess ? 'verified' : 'unverified',
        dnsRecords,
        instructions: isVerified
          ? ['Sending identity is verified in Amazon SES.']
          : [
              `Create a verified identity for ${emailToVerify} or ${domain} in AWS SES console.`,
              'Add the generated DKIM CNAME records to your DNS provider.',
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
        instructions: ['Unable to query AWS SES identity. Check SES read permissions for IAM credentials.'],
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const res = await this.client.sendEmail({
      to: payload.to,
      from: payload.from || this.defaultSenderEmail,
      fromName: payload.fromName || this.defaultSenderName,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: payload.headers,
    });

    return {
      messageId: res.MessageId ? `<${res.MessageId}@email.amazonses.com>` : `<ses-${Date.now()}@email.amazonses.com>`,
      accepted: true,
      provider: 'ses',
      rawResponse: res,
    };
  }

  async disconnect(): Promise<void> {
    // Stateless HTTP API
  }
}
