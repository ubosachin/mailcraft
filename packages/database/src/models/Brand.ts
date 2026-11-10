import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBrandDoc extends Document {
  sessionId: Types.ObjectId;
  brandName: string;
  senderName: string;
  senderEmail: string;
  website?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  footerAddress?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    website?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrandDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    primaryColor: {
      type: String,
      default: '#4F46E5',
    },
    secondaryColor: {
      type: String,
      default: '#10B981',
    },
    footerAddress: {
      type: String,
      trim: true,
    },
    socialLinks: {
      twitter: String,
      linkedin: String,
      instagram: String,
      website: String,
    },
  },
  {
    timestamps: true,
    collection: 'brands',
  }
);

export const Brand: Model<IBrandDoc> =
  mongoose.models.Brand || mongoose.model<IBrandDoc>('Brand', BrandSchema);

