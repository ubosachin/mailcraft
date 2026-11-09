import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { DeliveryStatus } from '@mailcraft/shared-types';

export interface ICampaignRecipientDoc extends Document {
  campaignId: Types.ObjectId;
  contactId?: Types.ObjectId;
  email: string;
  status: DeliveryStatus;
  providerMessageId?: string;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const CampaignRecipientSchema = new Schema<ICampaignRecipientDoc>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'queued',
        'accepted',
        'delivered',
        'bounced',
        'failed',
        'unsubscribed',
      ],
      default: 'pending',
      index: true,
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
    sentAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'campaign_recipients',
  }
);

CampaignRecipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });
CampaignRecipientSchema.index({ campaignId: 1, status: 1 });

export const CampaignRecipient: Model<ICampaignRecipientDoc> =
  mongoose.models.CampaignRecipient ||
  mongoose.model<ICampaignRecipientDoc>('CampaignRecipient', CampaignRecipientSchema);

