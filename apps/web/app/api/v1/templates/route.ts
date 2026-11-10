import { NextRequest } from 'next/server';
import { connectToDatabase, Template, seedTemplates } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'featured';

    let count = await Template.countDocuments({ isActive: true });
    if (count === 0) {
      console.log('[Templates API] Collection empty, executing automatic seed...');
      await seedTemplates();
      count = await Template.countDocuments({ isActive: true });
    }

    const query: Record<string, unknown> = { isActive: true };

    if (category && category !== 'all') {
      const normCat = category.toLowerCase().trim();
      if (normCat === 'festivals' || normCat === 'festival') {
        query.category = { $in: ['festivals', 'festival'] };
      } else if (normCat === 'product_launches' || normCat === 'product_launch') {
        query.category = { $in: ['product_launches', 'product_launch'] };
      } else if (normCat === 'discounts' || normCat === 'offers') {
        query.category = 'discounts';
      } else if (normCat === 'food' || normCat === 'restaurant') {
        query.category = 'food';
      } else {
        query.category = normCat;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { description: regex }, { slug: regex }, { category: regex }];
    }

    let sortOptions: Record<string, 1 | -1> = { createdAt: 1 };
    if (sort === 'name') {
      sortOptions = { name: 1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'popular' || sort === 'featured') {
      sortOptions = { isPremium: 1, createdAt: 1 };
    }

    const templates = await Template.find(query).sort(sortOptions);

    // Get category counts across all active templates for filter badges
    const allActive = await Template.find({ isActive: true }).select('category');
    const categoryCounts: Record<string, number> = { all: allActive.length };
    for (const item of allActive) {
      const cat = item.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    return jsonSuccess({
      total: templates.length,
      categoryCounts,
      templates: templates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        slug: t.slug,
        category: t.category,
        thumbnail: t.thumbnail,
        description: t.description,
        isPremium: t.isPremium,
        version: t.version,
        editorSchema: t.editorSchema,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
