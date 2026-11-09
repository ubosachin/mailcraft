export type GuestSessionStatus = 'active' | 'expired' | 'revoked';

export interface IGuestSession {
  _id: string;
  sessionTokenHash: string;
  verifiedEmail?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  status: GuestSessionStatus;
  ipAddressHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface GuestSessionPublic {
  id: string;
  status: GuestSessionStatus;
  verifiedEmail?: string | null;
  createdAt: string;
  expiresAt: string;
}
