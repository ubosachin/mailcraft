import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function jsonSuccess<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    const formatted = error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return jsonError('Validation failed', 422, formatted);
  }

  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }

  return jsonError('Internal server error occurred', 500);
}

