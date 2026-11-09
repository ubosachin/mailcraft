export type TemplateCategory =
  | 'ecommerce'
  | 'fashion'
  | 'technology'
  | 'food'
  | 'corporate'
  | 'festivals'
  | 'festival'
  | 'discounts'
  | 'product_launches'
  | 'product_launch'
  | 'welcome';

export type EditorBlockType =
  | 'logo'
  | 'hero'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'product_card'
  | 'product_grid'
  | 'discount_badge'
  | 'coupon'
  | 'social_links'
  | 'divider'
  | 'footer'
  | 'unsubscribe';

export interface IEditorBlock {
  id: string;
  type: EditorBlockType;
  /**
   * Block configuration parameters (props or data can be used interchangeably)
   */
  props?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface IEditorSettings {
  background?: string;
  backgroundColor?: string;
  contentWidth?: number;
  fontFamily?: string;
  textColor?: string;
  headerBackground?: string;
  footerBackground?: string;
}

export interface IEditorSchema {
  templateId?: string;
  version?: number;
  settings: IEditorSettings;
  blocks: IEditorBlock[];
}

export interface ITemplate {
  _id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  thumbnail: string;
  description: string;
  editorSchema: IEditorSchema;
  htmlTemplate?: string;
  isActive: boolean;
  isPremium: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderTemplateOptions {
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

export interface RenderTemplateResult {
  html: string;
  text: string;
  subject?: string;
  preheader?: string;
}
