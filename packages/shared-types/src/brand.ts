export interface IBrandSocials {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
}

export interface IBrand {
  _id: string;
  sessionId: string;
  brandName: string;
  senderName: string;
  senderEmail: string;
  website?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  footerAddress?: string;
  socialLinks?: IBrandSocials;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandPublic {
  id: string;
  brandName: string;
  senderName: string;
  senderEmail: string;
  website?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  footerAddress?: string;
  socialLinks?: IBrandSocials;
}
