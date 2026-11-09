export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'PROVIDER_ERROR',
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class AuthenticationFailedError extends ProviderError {
  constructor(provider: string, message: string = 'Provider credentials invalid or rejected') {
    super(message, provider, 401, 'AUTHENTICATION_FAILED', false);
    this.name = 'AuthenticationFailedError';
  }
}

export class TokenRevokedError extends ProviderError {
  constructor(provider: string, message: string = 'OAuth access token or refresh token has been revoked') {
    super(message, provider, 401, 'TOKEN_REVOKED', false);
    this.name = 'TokenRevokedError';
  }
}

export class SenderUnverifiedError extends ProviderError {
  constructor(provider: string, senderEmail: string, message?: string) {
    super(
      message || `Sender "${senderEmail}" is not verified with ${provider}. Verify DNS/sender identity first.`,
      provider,
      403,
      'SENDER_UNVERIFIED',
      false
    );
    this.name = 'SenderUnverifiedError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, public readonly retryAfterSeconds: number = 60) {
    super(
      `Rate limit exceeded for ${provider}. Retry in ${retryAfterSeconds}s.`,
      provider,
      429,
      'RATE_LIMIT_EXCEEDED',
      true
    );
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends ProviderError {
  constructor(provider: string, message: string = 'Daily account sending quota exceeded') {
    super(message, provider, 429, 'QUOTA_EXCEEDED', false);
    this.name = 'QuotaExceededError';
  }
}
