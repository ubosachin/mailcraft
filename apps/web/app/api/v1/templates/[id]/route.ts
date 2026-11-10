import { NextRequest } from 'next/server';
import { connectToDatabase } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { resolveTemplateByIdOrSlug } from '@/lib/templates';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();
    const { id } = await params;

    const template = await resolveTemplateByIdOrSlug(id);

    if (!template) {
      return jsonError(`Template '${id}' not found`, 404);
    }

    return jsonSuccess({
      id: template._id.toString(),
      name: template.name,
      slug: template.slug,
      category: template.category,
      thumbnail: template.thumbnail,
      description: template.description,
      editorSchema: template.editorSchema,
      isPremium: template.isPremium,
      version: template.version,
      createdAt: template.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
