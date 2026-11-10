export type UserSessionStatus = 'active' | 'expired' | 'revoked';

export interface IUserSession {
  _id: string;
  userId: string;
  sessionTokenHash: string;
  verifiedEmail?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  status: UserSessionStatus;
  ipAddressHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface UserSessionPublic {
  id: string;
  userId: string;
  status: UserSessionStatus;
  verifiedEmail?: string | null;
  createdAt: string;
  expiresAt: string;
}
