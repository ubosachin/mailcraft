export type AuthProvider = 'local' | 'google';

export interface IUser {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  avatarUrl?: string;
  authProvider: AuthProvider;
  createdAt: string;
  lastLoginAt?: string;
}

export interface IAuthResponse {
  user: IUser;
  session: {
    id: string;
    expiresAt: string;
    isGuestUpgraded?: boolean;
  };
}

export interface IAuthMeResponse {
  authenticated: boolean;
  user: IUser | null;
  session: {
    id: string;
    status: string;
    expiresAt: string;
    isGuest: boolean;
  } | null;
  brand?: {
    id: string;
    brandName: string;
    senderEmail: string;
  } | null;
  stats?: {
    campaignCount: number;
    contactCount: number;
  };
}

