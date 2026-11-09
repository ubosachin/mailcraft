import crypto from 'node:crypto';
import {
  IEmailProvider,
  SendEmailPayload,
  SendEmailResult,
  ConnectionVerificationResult,
  SenderVerificationResult,
} from '../types.js';

export class MockProvider implements IEmailProvider {
  readonly providerType = 'mock' as const;
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async verifyConnection(): Promise<ConnectionVerificationResult> {
    return {
      valid: true,
      provider: 'mock',
      senderEmail: 'mock-sender@mailcraft.dev',
      accountStatus: 'active',
      dailyQuotaRemaining: 10000,
    };
  }

  async verifySender(senderEmail = 'mock-sender@mailcraft.dev'): Promise<SenderVerificationResult> {
    return {
      verified: true,
      senderEmail,
      domain: senderEmail.split('@')[1] || 'mailcraft.dev',
      domainVerified: true,
      spfStatus: 'verified',
      dkimStatus: 'verified',
      dmarcStatus: 'verified',
      dnsRecords: [
        {
          type: 'TXT',
          name: senderEmail.split('@')[1] || 'mailcraft.dev',
          value: 'v=spf1 include:mailcraft.dev ~all',
          status: 'verified',
          description: 'SPF Record',
        },
      ],
      instructions: ['Mock provider identity automatically verified.'],
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    if (!this.connected) {
      await this.connect();
    }

    const messageId = `<mock-${crypto.randomUUID()}@mailcraft.local>`;

    console.log(
      `[MockProvider] Dispatched email to ${payload.to} | Subject: "${payload.subject}" | MsgId: ${messageId}`
    );

    return {
      messageId,
      accepted: true,
      provider: 'mock',
      rawResponse: {
        simulated: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}
