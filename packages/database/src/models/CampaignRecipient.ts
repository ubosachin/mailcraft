import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { RecipientDeliveryStatus } from '@mailcraft/shared-types';

export interface ICampaignRecipientDoc extends Document {
  campaignId: Types.ObjectId;
  sessionId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  email: string;
  personalizationData?: Record<string, unknown>;
  status: RecipientDeliveryStatus;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  queuedAt?: Date;
  sentAt?: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignRecipientSchema = new Schema<ICampaignRecipientDoc>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      default: null,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    personalizationData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: [
        'pending',
        'queued',
        'processing',
        'accepted',
        'delivered',
        'bounced',
        'failed',
        'skipped',
        'cancelled',
        'unsubscribed',
      ],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    errorCode: String,
    errorMessage: String,
    lastErrorCode: String,
    lastErrorMessage: String,
    queuedAt: Date,
    sentAt: Date,
    acceptedAt: Date,
    deliveredAt: Date,
    bouncedAt: Date,
  },
  {
    timestamps: true,
    collection: 'campaign_recipients',
  }
);

// Prevent duplicate recipients within the same campaign
CampaignRecipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });
CampaignRecipientSchema.index({ campaignId: 1, status: 1 });

export const CampaignRecipient: Model<ICampaignRecipientDoc> =
  mongoose.models.CampaignRecipient ||
  mongoose.model<ICampaignRecipientDoc>('CampaignRecipient', CampaignRecipientSchema);
