import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ConsentStatus } from '@mailcraft/shared-types';

export interface IContactDoc extends Document {
  sessionId: Types.ObjectId;
  email: string;
  normalizedEmail: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  phone?: string;
  tags: string[];
  consentStatus: ConsentStatus;
  consentSource: string;
  consentAt?: Date;
  consentEvidence?: string;
  consentPolicyVersion?: string;
  importBatchId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContactDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    normalizedEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    consentStatus: {
      type: String,
      enum: ['opted_in', 'unknown', 'unsubscribed', 'suppressed'],
      default: 'unknown',
      index: true,
    },
    consentSource: {
      type: String,
      default: 'manual_entry',
    },
    consentAt: {
      type: Date,
      default: null,
    },
    consentEvidence: {
      type: String,
      trim: true,
    },
    consentPolicyVersion: {
      type: String,
      default: 'v1.0',
    },
    importBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ContactImport',
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'contacts',
  }
);

// Indexes
ContactSchema.index({ sessionId: 1, normalizedEmail: 1 }, { unique: true });
ContactSchema.index({ sessionId: 1, createdAt: -1 });
ContactSchema.index({ sessionId: 1, consentStatus: 1 });
ContactSchema.index({ sessionId: 1, company: 1 });
ContactSchema.index({ sessionId: 1, tags: 1 });

export const Contact: Model<IContactDoc> =
  mongoose.models.Contact || mongoose.model<IContactDoc>('Contact', ContactSchema);
