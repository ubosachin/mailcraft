import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { GuestSessionStatus } from '@mailcraft/shared-types';

export interface IGuestSessionDoc extends Document {
  sessionTokenHash: string;
  userId?: Types.ObjectId | null;
  verifiedEmail?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  status: GuestSessionStatus;
  ipAddressHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

const GuestSessionSchema = new Schema<IGuestSessionDoc>(
  {
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    verifiedEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      index: true,
    },
    verificationCodeHash: {
      type: String,
      default: null,
    },
    verificationCodeExpiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
    ipAddressHash: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL Index
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'guest_sessions',
  }
);

export const GuestSession: Model<IGuestSessionDoc> =
  mongoose.models.GuestSession || mongoose.model<IGuestSessionDoc>('GuestSession', GuestSessionSchema);

