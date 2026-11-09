import { NextRequest } from 'next/server';
import { validateSchemaRequest } from '@mailcraft/validation';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateSchemaRequest.safeParse(body);

    if (!result.success) {
      const formattedErrors = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      return jsonError('Invalid editor schema structure', 400, {
        isValid: false,
        errors: formattedErrors,
      });
    }

    const schema = result.data.schema;

    return jsonSuccess({
      isValid: true,
      version: schema.version || 1,
      contentWidth: schema.settings?.contentWidth || 600,
      blockCount: schema.blocks?.length || 0,
      blockTypes: [...new Set(schema.blocks?.map((b) => b.type) || [])],
      message: 'Schema is valid for compilation and editing',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError('Schema validation failed', 400, {
        isValid: false,
        errors: error.errors,
      });
    }
    return jsonError(error instanceof Error ? error.message : 'Unknown validation error', 500);
  }
}

