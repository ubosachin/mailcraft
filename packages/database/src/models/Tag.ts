import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITagDoc extends Document {
  sessionId: Types.ObjectId;
  name: string;
  color: string;
  contactCount: number;
  createdAt: Date;
}

const TagSchema = new Schema<ITagDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#6366F1',
      trim: true,
    },
    contactCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'tags',
  }
);

TagSchema.index({ sessionId: 1, name: 1 }, { unique: true });

export const Tag: Model<ITagDoc> =
  mongoose.models.Tag || mongoose.model<ITagDoc>('Tag', TagSchema);
