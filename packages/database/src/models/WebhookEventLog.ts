import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebhookEventLogDoc extends Document {
  provider: 'brevo' | 'ses' | 'generic';
  eventId?: string;
  signatureValid: boolean;
  rawHeaders?: Record<string, string>;
  rawPayload: Record<string, unknown>;
  processingStatus: 'processed' | 'ignored' | 'failed';
  errorMessage?: string;
  receivedAt: Date;
}

const WebhookEventLogSchema = new Schema<IWebhookEventLogDoc>(
  {
    provider: {
      type: String,
      enum: ['brevo', 'ses', 'generic'],
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      default: null,
      index: true,
    },
    signatureValid: {
      type: Boolean,
      default: true,
    },
    rawHeaders: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    processingStatus: {
      type: String,
      enum: ['processed', 'ignored', 'failed'],
      default: 'processed',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: { expires: 30 * 24 * 3600 },
    },
  },
  {
    timestamps: false,
    collection: 'webhook_event_logs',
  }
);

WebhookEventLogSchema.index({ provider: 1, eventId: 1, receivedAt: -1 });

export const WebhookEventLog: Model<IWebhookEventLogDoc> =
  mongoose.models.WebhookEventLog ||
  mongoose.model<IWebhookEventLogDoc>('WebhookEventLog', WebhookEventLogSchema);

