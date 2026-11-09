import { GuestSessionPublic } from './session.js';
import { BrandPublic } from './brand.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}

export interface GuestStartResponse {
  session: GuestSessionPublic;
  token: string;
}

export interface GuestMeResponse {
  session: GuestSessionPublic;
  brand: BrandPublic | null;
}
