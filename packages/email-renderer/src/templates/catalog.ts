import { ALL_TEMPLATES } from '../registry/template-registry.js';
import { ITemplate } from '@mailcraft/shared-types';

export const TEMPLATE_CATALOG: Array<Omit<ITemplate, '_id' | 'createdAt' | 'updatedAt'>> =
  ALL_TEMPLATES.map((t) => ({
    name: t.name,
    slug: t.slug,
    category: t.category,
    thumbnail: t.thumbnail,
    description: t.description,
    isActive: t.isActive,
    isPremium: t.isPremium,
    version: t.version,
    editorSchema: t.editorSchema,
  }));
