import { NextRequest } from 'next/server';
import { connectToDatabase, Template } from '@mailcraft/database';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const template =
      (await Template.findById(id)) || (await Template.findOne({ slug: id }));

    if (!template) {
      return jsonError('Template not found', 404);
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}

