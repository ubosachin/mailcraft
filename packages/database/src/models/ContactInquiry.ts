import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactInquiryDoc extends Document {
  email: string;
  message: string;
  ipAddress?: string;
  notifiedAdmin: boolean;
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const ContactInquirySchema = new Schema<IContactInquiryDoc>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    notifiedAdmin: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved'],
      default: 'new',
    },
  },
  {
    timestamps: true,
    collection: 'contact_inquiries',
  }
);

export const ContactInquiry: Model<IContactInquiryDoc> =
  (mongoose.models.ContactInquiry as Model<IContactInquiryDoc>) ||
  mongoose.model<IContactInquiryDoc>('ContactInquiry', ContactInquirySchema);

