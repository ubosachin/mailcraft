/**
 * MailCraft Background Worker Structured Logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface WorkerLogContext {
  jobId?: string;
  campaignId?: string;
  recipientEmail?: string;
  provider?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = /token|secret|key|password|auth|credential|iv|tag/i;

function redactData(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactData);

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactData(value);
    } else if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
      const parts = value.split('@');
      const name = parts[0];
      const domain = parts[1];
      const masked = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
      redacted[key] = `${masked}@${domain}`;
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class WorkerLogger {
  private service = 'mailcraft-worker';
  private environment = process.env.NODE_ENV || 'development';

  private log(level: LogLevel, message: string, context?: WorkerLogContext, error?: unknown) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      service: this.service,
      environment: this.environment,
      level,
      message,
    };

    if (context) {
      entry.data = redactData(context);
    }

    if (error) {
      if (error instanceof Error) {
        entry.error = { name: error.name, message: error.message };
      } else {
        entry.error = { message: String(error) };
      }
    }

    if (this.environment === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[Worker:${level.toUpperCase()}] ${message}`, entry.data || '');
    }
  }

  info(message: string, context?: WorkerLogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: WorkerLogContext, error?: unknown) {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: WorkerLogContext, error?: unknown) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: WorkerLogContext) {
    this.log('debug', message, context);
  }
}

export const workerLogger = new WorkerLogger();

