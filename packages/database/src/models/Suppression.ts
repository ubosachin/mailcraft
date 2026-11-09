import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { SuppressionReason, SuppressionScope, ISuppressionMetadata } from '@mailcraft/shared-types';

export interface ISuppressionDoc extends Document {
  emailHash: string;
  emailEncrypted: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  sessionId?: Types.ObjectId;
  metadata?: ISuppressionMetadata;
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
      enum: [
        'unsubscribe',
        'bounce',
        'hard_bounce',
        'soft_bounce_threshold',
        'complaint',
        'manual',
        'administrative',
      ],
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'suppressions',
  }
);

SuppressionSchema.index({ emailHash: 1, scope: 1 });
SuppressionSchema.index({ sessionId: 1, createdAt: -1 });

export const Suppression: Model<ISuppressionDoc> =
  mongoose.models.Suppression ||
  mongoose.model<ISuppressionDoc>('Suppression', SuppressionSchema);
