import { Template, seedTemplates, ITemplateDoc } from '@mailcraft/database';
import { TEMPLATE_CATALOG, getTemplateBySlug } from '@mailcraft/email-renderer';

/**
 * Ensures all templates defined in `TEMPLATE_CATALOG` exist in MongoDB.
 * Uses a fast slug check so existing deployments automatically receive new templates
 * without requiring a manual seed command.
 */
export async function syncTemplateCatalogIfNeeded(): Promise<void> {
  const activeSlugs = (await Template.distinct('slug', { isActive: true })) as string[];
  const existing = new Set(activeSlugs);
  const missingAny = TEMPLATE_CATALOG.some((t) => !existing.has(t.slug));
  if (missingAny) {
    await seedTemplates();
  }
}

/**
 * Resolves a template document by Mongo ObjectId or slug, falling back to
 * the in-memory `@mailcraft/email-renderer` catalog and upserting into MongoDB if needed.
 */
export async function resolveTemplateByIdOrSlug(idOrSlug: string): Promise<ITemplateDoc | null> {
  const trimmed = idOrSlug.trim();
  const isHexObjectId = /^[0-9a-fA-F]{24}$/.test(trimmed);

  let template: ITemplateDoc | null = null;
  if (isHexObjectId) {
    template = await Template.findById(trimmed);
  }
  if (!template) {
    template = await Template.findOne({ slug: trimmed.toLowerCase() });
  }

  if (!template) {
    const catalogItem = getTemplateBySlug(trimmed);
    if (catalogItem) {
      template = await Template.findOneAndUpdate(
        { slug: catalogItem.slug },
        {
          $set: {
            name: catalogItem.name,
            slug: catalogItem.slug,
            category: catalogItem.category,
            thumbnail: catalogItem.thumbnail,
            description: catalogItem.description,
            editorSchema: catalogItem.editorSchema,
            isActive: catalogItem.isActive,
            isPremium: catalogItem.isPremium,
            version: catalogItem.version,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  return template;
}

