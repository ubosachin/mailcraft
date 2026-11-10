import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CampaignStatus, ICampaignStats, ICampaignSnapshot } from '@mailcraft/shared-types';

export interface ICampaignDoc extends Document {
  sessionId: Types.ObjectId;
  brandId: Types.ObjectId;
  connectionId?: Types.ObjectId;
  campaignName: string;
  description?: string;
  subject: string;
  preheader?: string;
  senderName?: string;
  senderEmail?: string;
  provider?: string;
  templateId?: Types.ObjectId;
  editorData: Record<string, unknown>;
  renderedHtml?: string;
  renderedText?: string;
  audienceType?: 'all_eligible' | 'segment' | 'tag' | 'custom_selection';
  audienceFilters?: Record<string, unknown>;
  recipientCount: number;
  eligibleRecipientCount?: number;
  status: CampaignStatus;
  stats: ICampaignStats;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  snapshot?: ICampaignSnapshot;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaignDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailConnection',
      default: null,
      index: true,
    },
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
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
      default: '',
    },
    senderName: {
      type: String,
      trim: true,
    },
    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    provider: {
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
    renderedText: {
      type: String,
    },
    audienceType: {
      type: String,
      enum: ['all_eligible', 'segment', 'tag', 'custom_selection'],
      default: 'all_eligible',
    },
    audienceFilters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    eligibleRecipientCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'validating',
        'scheduled',
        'queued',
        'sending',
        'paused',
        'completed',
        'partially_completed',
        'failed',
        'cancelling',
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
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'campaigns',
  }
);

CampaignSchema.index({ sessionId: 1, status: 1 });
CampaignSchema.index({ sessionId: 1, createdAt: -1 });

export const Campaign: Model<ICampaignDoc> =
  mongoose.models.Campaign || mongoose.model<ICampaignDoc>('Campaign', CampaignSchema);
