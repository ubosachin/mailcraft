import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CampaignEventType } from '@mailcraft/shared-types';

export interface ICampaignEventDoc extends Document {
  campaignId: Types.ObjectId;
  recipientId?: Types.ObjectId;
  eventType: CampaignEventType;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

const CampaignEventSchema = new Schema<ICampaignEventDoc>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignRecipient',
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'complained',
        'unsubscribed',
      ],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'campaign_events',
  }
);

CampaignEventSchema.index({ campaignId: 1, occurredAt: -1 });

export const CampaignEvent: Model<ICampaignEventDoc> =
  mongoose.models.CampaignEvent ||
  mongoose.model<ICampaignEventDoc>('CampaignEvent', CampaignEventSchema);
