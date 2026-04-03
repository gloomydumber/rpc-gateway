import { ErrorCode, type ErrorCodeType } from '@rpc-gateway/shared';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCodeType,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends AppError {
  constructor(details?: unknown) {
    super(
      'Unable to fetch balance at this time. Please try again later.',
      ErrorCode.PROVIDER_ERROR,
      502,
      details,
    );
    this.name = 'ProviderError';
  }
}

export class TimeoutError extends AppError {
  constructor() {
    super('The request took too long. Please try again.', ErrorCode.TIMEOUT, 504);
    this.name = 'TimeoutError';
  }
}
