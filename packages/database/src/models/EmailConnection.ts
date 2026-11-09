import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { EmailProviderType, ConnectionStatus, IEncryptedCredentials } from '@mailcraft/shared-types';

export interface IEmailConnectionDoc extends Document {
  sessionId: Types.ObjectId;
  provider: EmailProviderType;
  senderEmail: string;
  encryptedCredentials: IEncryptedCredentials;
  credentialVersion: number;
  status: ConnectionStatus;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailConnectionSchema = new Schema<IEmailConnectionDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'brevo', 'ses'],
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    encryptedCredentials: {
      iv: { type: String, required: true },
      tag: { type: String, required: true },
      data: { type: String, required: true },
    },
    credentialVersion: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'revoked'],
      default: 'connected',
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

