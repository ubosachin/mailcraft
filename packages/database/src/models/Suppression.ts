import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { SuppressionReason, SuppressionScope } from '@mailcraft/shared-types';

export interface ISuppressionDoc extends Document {
  emailHash: string;
  emailEncrypted: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  sessionId?: Types.ObjectId;
  createdAt: Date;
}

const SuppressionSchema = new Schema<ISuppressionDoc>(
  {
    emailHash: {
      type: String,
      required: true,
      index: true,
    },
    emailEncrypted: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'complaint', 'manual'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['global', 'session'],
      default: 'global',
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'suppressions',
  }
);

SuppressionSchema.index({ emailHash: 1, scope: 1 });

export const Suppression: Model<ISuppressionDoc> =
  mongoose.models.Suppression ||
  mongoose.model<ISuppressionDoc>('Suppression', SuppressionSchema);
