/**
 * MailCraft Production Structured Logger
 * Emits JSON-formatted structured logs with automatic credential and PII redaction.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  campaignId?: string;
  eventType?: string;
  service?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = /token|secret|key|password|auth|credential|iv|tag|cookie/i;

/**
 * Recursively redacts sensitive keys from log objects
 */
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[MAX_DEPTH]';
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
      // Mask email addresses: al***@domain.com
      const parts = value.split('@');
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
      redacted[key] = `${maskedName}@${domain}`;
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export class Logger {
  private service: string;
  private environment: string;

  constructor(service = 'mailcraft-web') {
    this.service = service;
    this.environment = process.env.NODE_ENV || 'development';
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      service: context?.service || this.service,
      environment: this.environment,
      level,
      message,
    };

    if (context?.requestId) logEntry.requestId = context.requestId;
    if (context?.sessionId) logEntry.sessionId = context.sessionId.substring(0, 8) + '...';
    if (context?.campaignId) logEntry.campaignId = context.campaignId;
    if (context?.eventType) logEntry.eventType = context.eventType;

    if (context) {
      const { requestId, sessionId, campaignId, eventType, service, ...rest } = context;
      if (Object.keys(rest).length > 0) {
        logEntry.data = redactSensitiveData(rest);
      }
    }

    if (error) {
      if (error instanceof Error) {
        logEntry.error = {
          name: error.name,
          message: error.message,
          stack: this.environment === 'production' ? undefined : error.stack,
        };
      } else {
        logEntry.error = { message: String(error) };
      }
    }

    const jsonString = JSON.stringify(logEntry);

    // In local development, pretty print for readability
    if (this.environment === 'development') {
      const color =
        level === 'error'
          ? '\x1b[31m'
          : level === 'warn'
          ? '\x1b[33m'
          : level === 'info'
          ? '\x1b[36m'
          : '\x1b[90m';
      console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${message}`, logEntry.data || '');
      if (logEntry.error) console.error(logEntry.error);
    } else {
      // In production or test, output single-line NDJSON
      if (level === 'error') {
        console.error(jsonString);
      } else if (level === 'warn') {
        console.warn(jsonString);
      } else {
        console.log(jsonString);
      }
    }

    // Optional Sentry integration hook
    if (level === 'error' && process.env.SENTRY_DSN) {
      // Sentry capture hook if SDK initialized
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: unknown) {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: unknown) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.DEBUG === 'true' || this.environment !== 'production') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger('mailcraft-web');
