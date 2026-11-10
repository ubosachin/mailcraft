import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  EmailProviderType,
  ConnectionStatus,
  SenderVerificationStatus,
  IEncryptedCredentials,
} from '@mailcraft/shared-types';

export interface IEmailConnectionDoc extends Document {
  sessionId: Types.ObjectId;
  provider: EmailProviderType;
  senderEmail: string;
  senderName?: string;
  encryptedCredentials: IEncryptedCredentials;
  credentialVersion: number;
  status: ConnectionStatus;
  senderVerificationStatus?: SenderVerificationStatus;
  providerAccountStatus?: string;
  dailyQuotaLimit?: number | null;
  dailySentCount: number;
  dailySentWindowStart?: Date | null;
  lastVerifiedAt?: Date;
  lastError?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailConnectionSchema = new Schema<IEmailConnectionDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'gmail_smtp', 'brevo', 'ses'],
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    encryptedCredentials: {
      iv: { type: String, required: true },
      tag: { type: String, required: true },
      data: { type: String, required: true },
      keyVersion: { type: Number, default: 1 },
    },
    credentialVersion: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: [
        'connected',
        'disconnected',
        'revoked',
        'verification_required',
        'auth_failed',
        'connecting',
      ],
      default: 'connected',
    },
    senderVerificationStatus: {
      type: String,
      enum: ['verified', 'pending', 'unverified', 'failed'],
      default: 'unverified',
    },
    providerAccountStatus: {
      type: String,
      default: 'active',
    },
    dailyQuotaLimit: {
      type: Number,
      default: null,
    },
    dailySentCount: {
      type: Number,
      default: 0,
    },
    dailySentWindowStart: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'email_connections',
  }
);

EmailConnectionSchema.index({ sessionId: 1, provider: 1 });

export const EmailConnection: Model<IEmailConnectionDoc> =
  mongoose.models.EmailConnection ||
  mongoose.model<IEmailConnectionDoc>('EmailConnection', EmailConnectionSchema);

