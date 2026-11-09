export type EmailProviderType = 'gmail' | 'brevo' | 'ses';
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'revoked'
  | 'verification_required'
  | 'auth_failed'
  | 'connecting';

export type SenderVerificationStatus =
  | 'verified'
  | 'pending'
  | 'unverified'
  | 'failed';

export interface IEncryptedCredentials {
  iv: string;
  tag: string;
  data: string;
  keyVersion?: number;
}

export interface DnsRecordGuidance {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  status: 'verified' | 'pending' | 'missing';
  description?: string;
}

export interface SenderVerificationDetails {
  verified: boolean;
  senderEmail: string;
  domain?: string;
  domainVerified?: boolean;
  spfStatus?: 'verified' | 'pending' | 'unverified';
  dkimStatus?: 'verified' | 'pending' | 'unverified';
  dmarcStatus?: 'verified' | 'pending' | 'unverified';
  dnsRecords?: DnsRecordGuidance[];
  instructions?: string[];
}

export interface IEmailConnection {
  _id: string;
  sessionId: string;
  provider: EmailProviderType;
  senderEmail: string;
  senderName?: string;
  encryptedCredentials: IEncryptedCredentials;
  credentialVersion: number;
  status: ConnectionStatus;
  senderVerificationStatus?: SenderVerificationStatus;
  providerAccountStatus?: string;
  lastVerifiedAt?: Date;
  lastError?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailProviderSummary {
  id: string;
  provider: EmailProviderType;
  senderEmail: string;
  senderName?: string;
  status: ConnectionStatus;
  senderVerificationStatus?: SenderVerificationStatus;
  providerAccountStatus?: string;
  lastVerifiedAt?: string;
  lastError?: string;
  verifiedAt?: string;
  createdAt: string;
}

