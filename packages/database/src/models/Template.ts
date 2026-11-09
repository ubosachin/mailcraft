import mongoose, { Schema, Document, Model } from 'mongoose';
import { TemplateCategory, IEditorSchema } from '@mailcraft/shared-types';

export interface ITemplateDoc extends Document {
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

const TemplateSchema = new Schema<ITemplateDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'ecommerce',
        'fashion',
        'technology',
        'food',
        'corporate',
        'festivals',
        'festival',
        'discounts',
        'product_launches',
        'product_launch',
        'welcome',
      ],
      required: true,
      index: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    editorSchema: {
      type: Schema.Types.Mixed,
      required: true,
    },
    htmlTemplate: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'templates',
  }
);

TemplateSchema.index({ category: 1, isActive: 1 });

export const Template: Model<ITemplateDoc> =
  mongoose.models.Template || mongoose.model<ITemplateDoc>('Template', TemplateSchema);

