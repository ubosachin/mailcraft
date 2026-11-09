import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CampaignStatus, ICampaignStats } from '@mailcraft/shared-types';

export interface ICampaignDoc extends Document {
  sessionId: Types.ObjectId;
  brandId: Types.ObjectId;
  connectionId?: Types.ObjectId;
  campaignName: string;
  subject: string;
  preheader?: string;
  templateId?: Types.ObjectId;
  editorData: Record<string, unknown>;
  renderedHtml?: string;
  recipientCount: number;
  status: CampaignStatus;
  stats: ICampaignStats;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaignDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailConnection',
      default: null,
    },
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    preheader: {
      type: String,
      trim: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
    editorData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    renderedHtml: {
      type: String,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'queued',
        'sending',
        'completed',
        'paused',
        'failed',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    stats: {
      accepted: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'campaigns',
  }
);

CampaignSchema.index({ sessionId: 1, createdAt: -1 });

export const Campaign: Model<ICampaignDoc> =
  mongoose.models.Campaign || mongoose.model<ICampaignDoc>('Campaign', CampaignSchema);
