import {
  IEditorSchema,
  IEditorBlock,
  TemplateCategory,
} from '@mailcraft/shared-types';

export interface BlockContext {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  defaultTextColor: string;
  contentWidth: number;
  backgroundColor: string;
}

export interface BlockRenderResult {
  html: string;
  text: string;
}

export interface RenderEmailOptions {
  schema: IEditorSchema;
  brand?: {
    brandName?: string;
    senderName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    website?: string;
    footerAddress?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      facebook?: string;
      youtube?: string;
    };
  };
  recipient?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    unsubscribeUrl?: string;
  };
  campaign?: {
    subject?: string;
    preheader?: string;
  };
}

export interface RenderResult {
  html: string;
  text: string;
  subject?: string;
  preheader?: string;
}

export interface TemplateDefinition {
  name: string;
  slug: string;
  category: TemplateCategory;
  thumbnail: string;
  description: string;
  features: string[];
  recommendedFor: string;
  isActive: boolean;
  isPremium: boolean;
  version: number;
  editorSchema: IEditorSchema;
}

