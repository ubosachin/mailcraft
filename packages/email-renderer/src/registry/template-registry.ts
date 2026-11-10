import { TemplateDefinition } from '../types/template.types.js';
import { obsidianChangelogTemplate } from '../templates/obsidian-changelog.js';
import { bentoDigestTemplate } from '../templates/bento-digest.js';
import { founderWelcomeTemplate } from '../templates/founder-welcome.js';
import { nordicCommerceTemplate } from '../templates/nordic-commerce.js';
import { keynoteInviteTemplate } from '../templates/keynote-invite.js';
import { cobaltFlashDropTemplate } from '../templates/cobalt-flash-drop.js';
import { atelierLookbookTemplate } from '../templates/atelier-lookbook.js';
import { roasteryReserveTemplate } from '../templates/roastery-reserve.js';
import { luminaGalaTemplate } from '../templates/lumina-gala.js';
import { minimalPremiumTemplate } from '../templates/minimal-premium.js';
import { colorfulSaleTemplate } from '../templates/colorful-sale.js';
import { luxuryBrandTemplate } from '../templates/luxury-brand.js';
import { techLaunchTemplate } from '../templates/tech-launch.js';
import { festiveSpecialTemplate } from '../templates/festive-special.js';
import { foodRestaurantTemplate } from '../templates/food-restaurant.js';
import { startupModernTemplate } from '../templates/startup-modern.js';
import { fashionStoreTemplate } from '../templates/fashion-store.js';
import { corporateTemplate } from '../templates/corporate.js';
import { flashSaleTemplate } from '../templates/flash-sale.js';
import { welcomeOfferTemplate } from '../templates/welcome-offer.js';
import { productLaunchTemplate } from '../templates/product-launch.js';

export const ALL_TEMPLATES: TemplateDefinition[] = [
  obsidianChangelogTemplate,
  bentoDigestTemplate,
  founderWelcomeTemplate,
  nordicCommerceTemplate,
  keynoteInviteTemplate,
  cobaltFlashDropTemplate,
  atelierLookbookTemplate,
  roasteryReserveTemplate,
  luminaGalaTemplate,
  minimalPremiumTemplate,
  colorfulSaleTemplate,
  luxuryBrandTemplate,
  techLaunchTemplate,
  festiveSpecialTemplate,
  foodRestaurantTemplate,
  startupModernTemplate,
  fashionStoreTemplate,
  corporateTemplate,
  flashSaleTemplate,
  welcomeOfferTemplate,
  productLaunchTemplate,
];

export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  const normalized = slug.toLowerCase().trim();
  return ALL_TEMPLATES.find((t) => t.slug === normalized);
}

export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  if (!category || category === 'all') {
    return ALL_TEMPLATES;
  }
  const norm = category.toLowerCase().trim();
  return ALL_TEMPLATES.filter((t) => {
    if (norm === 'discounts' || norm === 'offers') {
      return t.category === 'discounts';
    }
    if (norm === 'festivals' || norm === 'festival') {
      return t.category === 'festivals' || t.category === 'festival';
    }
    if (norm === 'product_launches' || norm === 'product_launch') {
      return t.category === 'product_launches' || t.category === 'product_launch';
    }
    if (norm === 'food' || norm === 'restaurant') {
      return t.category === 'food';
    }
    return t.category === norm;
  });
}

export function searchTemplates(options: {
  query?: string;
  category?: string;
  sort?: 'popular' | 'name' | 'newest';
}): TemplateDefinition[] {
  const { query, category, sort } = options;
  let results = [...ALL_TEMPLATES];

  if (category && category !== 'all') {
    results = getTemplatesByCategory(category);
  }

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.recommendedFor.toLowerCase().includes(q) ||
        t.features.some((f) => f.toLowerCase().includes(q))
    );
  }

  if (sort === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'newest') {
    // preserve reverse chronological or by version
    results.sort((a, b) => b.version - a.version);
  }

  return results;
}

