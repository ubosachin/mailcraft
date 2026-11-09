import { NextRequest } from 'next/server';
import { connectToDatabase, Template } from '@mailcraft/database';
import { TEMPLATE_CATALOG } from '@mailcraft/email-renderer';
import { jsonSuccess, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const category = request.nextUrl.searchParams.get('category');
    const query: Record<string, unknown> = { isActive: true };
    if (category && category !== 'all') {
      query.category = category;
    }

    let templates = await Template.find(query).sort({ createdAt: 1 });

    // Auto-seed initial catalog if empty
    if (templates.length === 0) {
      console.log('[Template Seeder] Seeding 12 initial email templates...');
      await Template.insertMany(TEMPLATE_CATALOG);
      templates = await Template.find(query).sort({ createdAt: 1 });
    }

    return jsonSuccess(
      templates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        slug: t.slug,
        category: t.category,
        thumbnail: t.thumbnail,
        description: t.description,
        isPremium: t.isPremium,
        version: t.version,
        editorSchema: t.editorSchema,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

