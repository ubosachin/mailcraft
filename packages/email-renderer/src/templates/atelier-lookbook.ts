import { TemplateDefinition } from '../types/template.types.js';

export const atelierLookbookTemplate: TemplateDefinition = {
  name: "Atelier Capsule '26",
  slug: 'atelier-lookbook',
  category: 'fashion',
  thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80',
  description: 'Contemporary fashion lookbook pairing warm alabaster tones with editorial silhouette copy and two-column garment cards.',
  features: ['Warm stone aesthetic', 'Lookbook editorial split', 'Curated 2-piece garment grid', 'Minimal architectural CTA'],
  recommendedFor: 'Apparel labels, seasonal lookbooks, contemporary boutiques, and capsule drops.',
  isActive: true,
  isPremium: true,
  version: 2,
  editorSchema: {
    templateId: 'atelier-lookbook',
    version: 2,
    settings: {
      background: '#F5F0EB',
      contentWidth: 600,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      textColor: '#1C1917',
    },
    blocks: [
      {
        id: 'atl-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 140,
          tagline: 'AUTUMN / WINTER CAPSULE LOOKBOOK',
          padding: '30px 32px 14px',
        },
      },
      {
        id: 'atl-hero',
        type: 'hero',
        props: {
          title: 'Soft Tailoring & Tactile Wool.',
          subtitle: 'Fluid outerwear and structured knitwear designed for effortless movement from studio to evening.',
          backgroundColor: '#F5F0EB',
          titleColor: '#1C1917',
          subtitleColor: '#57534E',
          alignment: 'center',
          padding: '32px 32px',
        },
      },
      {
        id: 'atl-story',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80',
          heading: 'Look 01: The Architectural Coat',
          text: 'Spun from brushed Italian virgin wool with clean horn closures, relaxed dropped shoulders, and satin twill lining.',
          buttonText: 'View Silhouette',
          buttonUrl: 'https://example.com/coat',
          imagePosition: 'left',
        },
      },
      {
        id: 'atl-grid',
        type: 'product_grid',
        props: {
          products: [
            {
              title: 'Double-Faced Overcoat',
              price: '$480',
              imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
              buttonText: 'View Piece',
              url: 'https://example.com/overcoat',
            },
            {
              title: 'Silk Blend Atelier Shirt',
              price: '$210',
              imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80',
              buttonText: 'View Piece',
              url: 'https://example.com/shirt',
            },
          ],
        },
      },
      {
        id: 'atl-cta',
        type: 'button',
        props: {
          text: 'Explore Full Lookbook',
          url: 'https://example.com/lookbook',
          backgroundColor: '#1C1917',
          textColor: '#FFFFFF',
          borderRadius: 4,
          alignment: 'center',
        },
      },
      { id: 'atl-divider', type: 'divider', props: { color: '#E7E0D8' } },
      { id: 'atl-social', type: 'social_links', props: {} },
      { id: 'atl-footer', type: 'footer', props: {} },
      { id: 'atl-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

