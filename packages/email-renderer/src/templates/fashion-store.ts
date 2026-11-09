import { TemplateDefinition } from '../types/template.types.js';

export const fashionStoreTemplate: TemplateDefinition = {
  name: 'Fashion Store',
  slug: 'fashion-store',
  category: 'fashion',
  thumbnail: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop&q=80',
  description: 'Contemporary apparel editorial layout with seasonal lookbook highlights, 2-column product grid, and sleek shopping CTAs.',
  features: ['Editorial runway banner', '2-column responsive product grid', 'Seasonal collection highlights', 'Sleek luxury sans styling'],
  recommendedFor: 'Apparel brands, streetwear labels, activewear, footwear, and accessory designers.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'fashion-store',
    version: 1,
    settings: {
      background: '#F9FAFB',
      contentWidth: 600,
      fontFamily: "'Futura', 'Century Gothic', -apple-system, sans-serif",
      textColor: '#111827',
    },
    blocks: [
      {
        id: 'fash-badge',
        type: 'discount_badge',
        props: {
          text: 'NEW SS26 ARRIVALS ONLINE',
          backgroundColor: '#111827',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'fash-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 160,
          padding: '24px 32px 16px',
        },
      },
      {
        id: 'fash-hero',
        type: 'hero',
        props: {
          title: 'URBAN ESSENTIALS // DROP 01',
          subtitle: 'Sculpted silhouettes, Japanese selvedge denim, and breathable organic fabrics made for warm evenings.',
          backgroundColor: '#F3F4F6',
          titleColor: '#111827',
          subtitleColor: '#4B5563',
          padding: '36px 32px',
        },
      },
      {
        id: 'fash-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80',
          alt: 'Spring Summer Editorial Fashion Lookbook',
          caption: 'Shot on location in Tokyo — Capsule collection now live',
          borderRadius: 0,
          padding: '16px 32px',
        },
      },
      {
        id: 'fash-heading',
        type: 'heading',
        props: {
          text: 'Curated For Your Wardrobe',
          level: 'h2',
          alignment: 'center',
          color: '#111827',
        },
      },
      {
        id: 'fash-grid',
        type: 'product_grid',
        props: {
          products: [
            {
              title: 'Oversized Raw Linen Trench',
              price: '$240.00',
              originalPrice: '$290.00',
              imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
              buttonText: 'View Trench',
              url: 'https://example.com/trench',
            },
            {
              title: 'Relaxed Tapered Chino',
              price: '$120.00',
              originalPrice: '$150.00',
              imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop&q=80',
              buttonText: 'View Chino',
              url: 'https://example.com/chino',
            },
          ],
        },
      },
      {
        id: 'fash-cta',
        type: 'button',
        props: {
          text: 'SHOP ENTIRE SS26 CAPSULE',
          url: 'https://example.com/capsule',
          backgroundColor: '#111827',
          textColor: '#FFFFFF',
          borderRadius: 0,
        },
      },
      {
        id: 'fash-divider',
        type: 'divider',
        props: {
          color: '#E5E7EB',
        },
      },
      {
        id: 'fash-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'fash-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'fash-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

