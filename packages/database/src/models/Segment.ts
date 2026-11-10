import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ISegmentFilter } from '@mailcraft/shared-types';

export interface ISegmentDoc extends Document {
  sessionId: Types.ObjectId;
  name: string;
  description?: string;
  filters: ISegmentFilter;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentSchema = new Schema<ISegmentDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    contactCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'segments',
  }
);

SegmentSchema.index({ sessionId: 1, name: 1 });
SegmentSchema.index({ sessionId: 1, createdAt: -1 });

export const Segment: Model<ISegmentDoc> =
  mongoose.models.Segment || mongoose.model<ISegmentDoc>('Segment', SegmentSchema);
