import { decryptCredentials, IEmailConnectionDoc } from '@mailcraft/database';
import { IEmailProvider } from './types.js';
import { MockProvider } from './providers/mock.provider.js';
import { BrevoProvider } from './providers/brevo.provider.js';
import { GmailProvider } from './providers/gmail.provider.js';

export function createProviderFromConnection(connection: IEmailConnectionDoc): IEmailProvider {
  if (connection.status !== 'connected') {
    throw new Error(`Email connection is ${connection.status}`);
  }

  const decrypted = decryptCredentials<Record<string, unknown>>(connection.encryptedCredentials);

  switch (connection.provider) {
    case 'brevo': {
      const apiKey = (decrypted.apiKey as string) || '';
      return new BrevoProvider({
        apiKey,
        defaultSenderEmail: connection.senderEmail,
      });
    }

    case 'gmail': {
      const refreshToken = (decrypted.refreshToken as string) || '';
      return new GmailProvider({
        refreshToken,
        senderEmail: connection.senderEmail,
      });
    }

    default:
      return new MockProvider();
  }
}

export function createMockProvider(): IEmailProvider {
  return new MockProvider();
}

