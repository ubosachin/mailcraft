import crypto from 'node:crypto';
import { IEmailProvider, SendEmailPayload, SendEmailResult } from '../types.js';

export class MockProvider implements IEmailProvider {
  readonly providerType = 'mock';
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async verifySender(): Promise<boolean> {
    return true;
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

