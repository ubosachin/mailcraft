export type TemplateCategory =
  | 'ecommerce'
  | 'fashion'
  | 'technology'
  | 'food'
  | 'corporate'
  | 'festivals'
  | 'discounts'
  | 'product_launches';

export interface IEditorBlock {
  id: string;
  type:
    | 'logo'
    | 'hero'
    | 'heading'
    | 'paragraph'
    | 'image'
    | 'button'
    | 'product_card'
    | 'discount_badge'
    | 'coupon'
    | 'social_links'
    | 'footer'
    | 'unsubscribe';
  data: Record<string, unknown>;
}

export interface IEditorSchema {
  settings: {
    background: string;
    contentWidth: number;
    fontFamily: string;
    textColor?: string;
  };
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
