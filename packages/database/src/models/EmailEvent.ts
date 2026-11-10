import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { EmailEventType } from '@mailcraft/shared-types';

export interface IEmailEventDoc extends Document {
  sessionId: Types.ObjectId;
  campaignId: Types.ObjectId;
  campaignRecipientId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  provider: string;
  providerMessageId?: string;
  eventType: EmailEventType;
  eventTimestamp: Date;
  receivedAt: Date;
  eventId: string;
  metadata?: Record<string, unknown>;
  processingStatus: 'processed' | 'ignored' | 'failed';
}

const EmailEventSchema = new Schema<IEmailEventDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    campaignRecipientId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignRecipient',
      default: null,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    providerMessageId: {
      type: String,
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'provider_accepted',
        'delivered',
        'deferred',
        'soft_bounce',
        'hard_bounce',
        'complaint',
        'opened',
        'clicked',
        'unsubscribed',
        'rejected',
        'failed',
      ],
      required: true,
      index: true,
    },
    eventTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    eventId: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    processingStatus: {
      type: String,
      enum: ['processed', 'ignored', 'failed'],
      default: 'processed',
    },
  },
  {
    timestamps: false,
    collection: 'email_events',
  }
);

// Compound deduplication index to prevent duplicate provider events from inflating analytics
EmailEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
EmailEventSchema.index({ campaignId: 1, eventTimestamp: -1 });
EmailEventSchema.index({ campaignRecipientId: 1, eventTimestamp: -1 });
EmailEventSchema.index({ sessionId: 1, campaignId: 1 });
EmailEventSchema.index({ eventType: 1, eventTimestamp: -1 });

export const EmailEvent: Model<IEmailEventDoc> =
  mongoose.models.EmailEvent ||
  mongoose.model<IEmailEventDoc>('EmailEvent', EmailEventSchema);

