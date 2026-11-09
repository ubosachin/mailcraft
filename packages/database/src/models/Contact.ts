import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ConsentStatus } from '@mailcraft/shared-types';

export interface IContactDoc extends Document {
  sessionId: Types.ObjectId;
  email: string;
  name?: string;
  consentStatus: ConsentStatus;
  consentSource: string;
  consentAt?: Date;
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
    name: {
      type: String,
      trim: true,
    },
    consentStatus: {
      type: String,
      enum: ['opted_in', 'unknown', 'unsubscribed'],
      default: 'opted_in',
    },
    consentSource: {
      type: String,
      default: 'guest_upload',
    },
    consentAt: {
      type: Date,
      default: Date.now,
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

ContactSchema.index({ sessionId: 1, email: 1 }, { unique: true });

export const Contact: Model<IContactDoc> =
  mongoose.models.Contact || mongoose.model<IContactDoc>('Contact', ContactSchema);

