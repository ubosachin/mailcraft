export type EmailProviderType = 'gmail' | 'brevo' | 'ses';
export type ConnectionStatus = 'connected' | 'disconnected' | 'revoked';

export interface IEncryptedCredentials {
  iv: string;
  tag: string;
  data: string;
}

export interface IEmailConnection {
  _id: string;
  sessionId: string;
  provider: EmailProviderType;
  senderEmail: string;
  encryptedCredentials: IEncryptedCredentials;
  credentialVersion: number;
  status: ConnectionStatus;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailProviderSummary {
  id: string;
  provider: EmailProviderType;
  senderEmail: string;
  status: ConnectionStatus;
  verifiedAt?: string;
}

