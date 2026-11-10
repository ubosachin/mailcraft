import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { UserSessionStatus } from '@mailcraft/shared-types';

export interface IUserSessionDoc extends Document {
  sessionTokenHash: string;
  tokenHashes?: string[];
  userId: Types.ObjectId;
  verifiedEmail?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  status: UserSessionStatus;
  ipAddressHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

const UserSessionSchema = new Schema<IUserSessionDoc>(
  {
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHashes: {
      type: [String],
      default: [],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    collection: 'user_sessions',
  }
);

export const UserSession: Model<IUserSessionDoc> =
  mongoose.models.UserSession || mongoose.model<IUserSessionDoc>('UserSession', UserSessionSchema);

