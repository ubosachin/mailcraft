import { decryptCredentials, IEmailConnectionDoc } from '@mailcraft/database';
import { IEmailProvider } from './types.js';
import { MockProvider } from './providers/mock.provider.js';
import { BrevoProvider } from './providers/brevo/brevo.provider.js';
import { GmailProvider } from './providers/gmail/gmail.provider.js';
import { SesProvider } from './providers/ses/ses.provider.js';

export function createProviderFromConnection(
  connection: IEmailConnectionDoc,
  options: { allowPending?: boolean } = {}
): IEmailProvider {
  if (connection.status === 'revoked' || connection.status === 'disconnected') {
    throw new Error(`Email connection is ${connection.status}`);
  }

  if (!options.allowPending && connection.status !== 'connected' && connection.status !== 'verification_required') {
    throw new Error(`Email connection is ${connection.status}`);
  }

  const decrypted = decryptCredentials<Record<string, unknown>>(connection.encryptedCredentials);

  switch (connection.provider) {
    case 'brevo': {
      const apiKey = (decrypted.apiKey as string) || '';
      return new BrevoProvider({
        apiKey,
        defaultSenderEmail: connection.senderEmail,
        defaultSenderName: connection.senderName,
      });
    }

    case 'gmail': {
      const refreshToken = (decrypted.refreshToken as string) || '';
      return new GmailProvider({
        refreshToken,
        senderEmail: connection.senderEmail,
        senderName: connection.senderName,
      });
    }

    case 'ses': {
      const accessKeyId = (decrypted.accessKeyId as string) || '';
      const secretAccessKey = (decrypted.secretAccessKey as string) || '';
      const region = (decrypted.region as string) || 'us-east-1';
      return new SesProvider({
        accessKeyId,
        secretAccessKey,
        region,
        defaultSenderEmail: connection.senderEmail,
        defaultSenderName: connection.senderName,
      });
    }

    default:
      return new MockProvider();
  }
}

export function createMockProvider(): IEmailProvider {
  return new MockProvider();
}
