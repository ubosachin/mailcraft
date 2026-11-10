import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITrackingTokenDoc extends Document {
  tokenHash: string;
  token?: string;
  type: 'open' | 'click' | 'unsubscribe';
  campaignId: Types.ObjectId;
  campaignRecipientId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  sessionId: Types.ObjectId;
  destinationUrl?: string;
  clickCount: number;
  openCount: number;
  firstClickedAt?: Date;
  lastClickedAt?: Date;
  firstOpenedAt?: Date;
  isBot: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const TrackingTokenSchema = new Schema<ITrackingTokenDoc>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    token: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ['open', 'click', 'unsubscribe'],
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
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    destinationUrl: {
      type: String,
      default: null,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    firstClickedAt: {
      type: Date,
      default: null,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    firstOpenedAt: {
      type: Date,
      default: null,
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'tracking_tokens',
  }
);

TrackingTokenSchema.index({ campaignId: 1, type: 1 });
TrackingTokenSchema.index({ sessionId: 1, type: 1 });

export const TrackingToken: Model<ITrackingTokenDoc> =
  mongoose.models.TrackingToken ||
  mongoose.model<ITrackingTokenDoc>('TrackingToken', TrackingTokenSchema);

