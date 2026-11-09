import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, Template } from '@mailcraft/database';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let template = null;
    const isHexObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isHexObjectId) {
      template = await Template.findById(id);
    }
    if (!template) {
      template = await Template.findOne({ slug: id.toLowerCase().trim() });
    }

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
