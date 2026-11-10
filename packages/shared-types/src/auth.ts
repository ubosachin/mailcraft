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
  };
}

export interface IAuthMeResponse {
  authenticated: boolean;
  user: IUser | null;
  session: {
    id: string;
    status: string;
    expiresAt: string;
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
