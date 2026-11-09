import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUnsubscribeEventDoc extends Document {
  contactId?: Types.ObjectId;
  campaignId?: Types.ObjectId;
  sessionId: Types.ObjectId;
  emailHash: string;
  source: 'one_click_header' | 'landing_page' | 'preference_center' | 'complaint_feedback';
  unsubscribedAt: Date;
  tokenHash?: string;
  metadata?: Record<string, unknown>;
}

const UnsubscribeEventSchema = new Schema<IUnsubscribeEventDoc>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    emailHash: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['one_click_header', 'landing_page', 'preference_center', 'complaint_feedback'],
      required: true,
    },
    unsubscribedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    tokenHash: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false,
    collection: 'unsubscribe_events',
  }
);

UnsubscribeEventSchema.index({ sessionId: 1, unsubscribedAt: -1 });

export const UnsubscribeEvent: Model<IUnsubscribeEventDoc> =
  mongoose.models.UnsubscribeEvent ||
  mongoose.model<IUnsubscribeEventDoc>('UnsubscribeEvent', UnsubscribeEventSchema);
