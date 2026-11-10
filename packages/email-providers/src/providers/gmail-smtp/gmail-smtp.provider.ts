import nodemailer, { Transporter } from 'nodemailer';
import { GMAIL_SMTP_DAILY_LIMIT } from '@mailcraft/shared-types';
import {
  IEmailProvider,
  SendEmailPayload,
  SendEmailResult,
  ConnectionVerificationResult,
  SenderVerificationResult,
} from '../../types.js';
import {
  AuthenticationFailedError,
  ProviderError,
  QuotaExceededError,
} from '../../errors/provider.errors.js';

export interface GmailSmtpProviderConfig {
  gmailAddress: string;
  appPassword: string;
  senderName?: string;
}

/**
 * Strips whitespace users copy from Google's 4x4 App Password display (`xxxx xxxx xxxx xxxx`).
 */
export function normalizeGoogleAppPassword(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

export class GmailSmtpProvider implements IEmailProvider {
  readonly providerType = 'gmail_smtp' as const;
  private gmailAddress: string;
  private appPassword: string;
  private senderName?: string;
  private transporter: Transporter | null = null;

  constructor(config: GmailSmtpProviderConfig) {
    this.gmailAddress = config.gmailAddress.toLowerCase().trim();
    this.appPassword = normalizeGoogleAppPassword(config.appPassword);
    this.senderName = config.senderName?.trim();
  }

  private getTransporter(): Transporter {
    if (!this.gmailAddress || !this.appPassword) {
      throw new AuthenticationFailedError(
        'gmail_smtp',
        'Gmail address and Google App Password are required.'
      );
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: this.gmailAddress,
          pass: this.appPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }

    return this.transporter;
  }

  private mapSmtpError(err: unknown): Error {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { responseCode?: number; code?: string })?.responseCode;

    if (code === 535 || /535|Username and Password not accepted|EAUTH|Invalid login/i.test(message)) {
      return new AuthenticationFailedError(
        'gmail_smtp',
        'Gmail App Password authentication failed. Enable 2-Step Verification on your Google Account and generate a 16-character App Password.'
      );
    }

    if (code === 550 && /5\.4\.5|Daily user sending limit/i.test(message)) {
      return new QuotaExceededError(
        'gmail_smtp',
        `Google SMTP daily sending quota exceeded (MailCraft limit: ${GMAIL_SMTP_DAILY_LIMIT}/day).`
      );
    }

    return new ProviderError(
      `Gmail SMTP error: ${message}`,
      'gmail_smtp',
      code || 500,
      'GMAIL_SMTP_ERROR'
    );
  }

  async connect(): Promise<void> {
    try {
      await this.getTransporter().verify();
    } catch (err) {
      throw this.mapSmtpError(err);
    }
  }

  async verifyConnection(): Promise<ConnectionVerificationResult> {
    try {
      if (!this.gmailAddress) {
        return {
          valid: false,
          provider: 'gmail_smtp',
          error: 'Gmail email address is required.',
        };
      }
      if (this.appPassword.length < 16) {
        return {
          valid: false,
          provider: 'gmail_smtp',
          error: 'Google App Password must be 16 characters (spaces optional).',
        };
      }

      await this.getTransporter().verify();

      return {
        valid: true,
        provider: 'gmail_smtp',
        senderEmail: this.gmailAddress,
        accountStatus: 'active',
        dailyQuotaRemaining: GMAIL_SMTP_DAILY_LIMIT,
      };
    } catch (err) {
      const mapped = this.mapSmtpError(err);
      return {
        valid: false,
        provider: 'gmail_smtp',
        error: mapped.message,
      };
    }
  }

  async verifySender(requestedSender?: string): Promise<SenderVerificationResult> {
    const emailToVerify = (requestedSender || this.gmailAddress).toLowerCase().trim();
    const matchesAccount = emailToVerify === this.gmailAddress;

    return {
      verified: matchesAccount,
      senderEmail: emailToVerify,
      domain: emailToVerify.split('@')[1],
      domainVerified: true,
      spfStatus: 'verified',
      dkimStatus: 'verified',
      dmarcStatus: 'verified',
      instructions: matchesAccount
        ? [
            `Authenticated via Google App Password SMTP (smtp.gmail.com:465) with a strict ${GMAIL_SMTP_DAILY_LIMIT.toLocaleString()} emails/day limit.`,
          ]
        : [
            `Sender email (${emailToVerify}) must match your authenticated Gmail address (${this.gmailAddress}).`,
          ],
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const displayName = payload.fromName || this.senderName;
    const fromHeader = displayName
      ? `"${displayName.replace(/"/g, '\\"')}" <${this.gmailAddress}>`
      : this.gmailAddress;

    try {
      const info = await this.getTransporter().sendMail({
        from: fromHeader,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        headers: payload.headers,
      });

      return {
        messageId: info.messageId || `<gmail-smtp-${Date.now()}@smtp.gmail.com>`,
        accepted: true,
        provider: 'gmail_smtp',
        rawResponse: { accepted: info.accepted, response: info.response },
      };
    } catch (err) {
      throw this.mapSmtpError(err);
    }
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

