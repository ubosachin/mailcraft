import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IContactImportDoc extends Document {
  sessionId: Types.ObjectId;
  originalFilename: string;
  fileType: 'csv' | 'xlsx' | 'paste';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingRows: number;
  suppressedRows: number;
  unknownConsentRows: number;
  importedRows: number;
  status: 'pending' | 'previewed' | 'processing' | 'completed' | 'failed' | 'cancelled';
  columnMapping: Record<string, string>;
  previewRows?: Array<Record<string, unknown>>;
  failedRows?: Array<{ rowNumber: number; raw: Record<string, unknown> | string; reason: string }>;
  createdAt: Date;
  completedAt?: Date;
}

const ContactImportSchema = new Schema<IContactImportDoc>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestSession',
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['csv', 'xlsx', 'paste'],
      required: true,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    invalidRows: {
      type: Number,
      default: 0,
    },
    duplicateRows: {
      type: Number,
      default: 0,
    },
    existingRows: {
      type: Number,
      default: 0,
    },
    suppressedRows: {
      type: Number,
      default: 0,
    },
    unknownConsentRows: {
      type: Number,
      default: 0,
    },
    importedRows: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'previewed', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'previewed',
      index: true,
    },
    columnMapping: {
      type: Schema.Types.Mixed,
      default: {},
    },
    previewRows: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    failedRows: {
      type: [
        {
          rowNumber: Number,
          raw: Schema.Types.Mixed,
          reason: String,
        },
      ],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'contact_imports',
  }
);

ContactImportSchema.index({ sessionId: 1, createdAt: -1 });

export const ContactImport: Model<IContactImportDoc> =
  mongoose.models.ContactImport ||
  mongoose.model<IContactImportDoc>('ContactImport', ContactImportSchema);
