import { TemplateDefinition } from '../types/template.types.js';

export const nordicCommerceTemplate: TemplateDefinition = {
  name: 'Nordic Aura Drop',
  slug: 'nordic-commerce',
  category: 'ecommerce',
  thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
  description: 'Minimalist Scandinavian commerce layout with sticky shipping ribbon, architectural lifestyle split, 2x2 product grid, and clean member code.',
  features: ['Express shipping top bar', 'Editorial image-text split', '4-item responsive product grid', 'Minimal VIP coupon'],
  recommendedFor: 'Modern DTC stores, homewares, desk accessories, lifestyle consumer brands, and seasonal drops.',
  isActive: true,
  isPremium: true,
  version: 2,
  editorSchema: {
    templateId: 'nordic-commerce',
    version: 2,
    settings: {
      background: '#F4F4F5',
      contentWidth: 600,
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      textColor: '#18181B',
    },
    blocks: [
      {
        id: 'nc-bar',
        type: 'announcement_bar',
        props: {
          text: 'COMPLIMENTARY EXPRESS SHIPPING ON ORDERS $95+',
          linkText: 'Shop Drop 04',
          url: 'https://example.com/drop',
          backgroundColor: '#18181B',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'nc-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 136,
          tagline: 'TACTILE OBJECTS FOR QUIET SPACES',
          padding: '28px 32px 14px',
        },
      },
      {
        id: 'nc-hero',
        type: 'hero',
        props: {
          title: 'Objects Designed For Quiet Mornings.',
          subtitle: 'Season 04 brings matte stone ceramics, brushed aluminum hardware, and tactile textiles crafted in limited batches.',
          backgroundColor: '#F4F4F5',
          titleColor: '#18181B',
          subtitleColor: '#52525B',
          alignment: 'center',
          padding: '36px 32px',
        },
      },
      {
        id: 'nc-split',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
          heading: 'Form Meets Daily Ritual',
          text: 'Each piece is kiln-fired in small coastal studios with raw mineral glazes built to age gracefully on your desk or table.',
          buttonText: 'Explore Story',
          buttonUrl: 'https://example.com/story',
          imagePosition: 'right',
        },
      },
      {
        id: 'nc-grid',
        type: 'product_grid',
        props: {
          products: [
            {
              title: 'Nordic Stone Lounge Chair',
              price: '$420',
              originalPrice: '$490',
              imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
              buttonText: 'Shop Piece',
              url: 'https://example.com/chair',
            },
            {
              title: 'Chronograph Matte Watch',
              price: '$265',
              originalPrice: '$310',
              imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
              buttonText: 'Shop Piece',
              url: 'https://example.com/watch',
            },
            {
              title: 'Sculptural Wall Relief',
              price: '$145',
              imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
              buttonText: 'Shop Piece',
              url: 'https://example.com/relief',
            },
            {
              title: 'Full-Grain Folio Carry',
              price: '$175',
              originalPrice: '$210',
              imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
              buttonText: 'Shop Piece',
              url: 'https://example.com/folio',
            },
          ],
        },
      },
      {
        id: 'nc-coupon',
        type: 'coupon',
        props: {
          code: 'NORDIC20',
          discount: '20% EARLY COLLECTION ACCESS',
          description: 'Private subscriber code valid across all Season 04 essentials until Sunday.',
          backgroundColor: '#FAFAFA',
          borderColor: '#18181B',
        },
      },
      {
        id: 'nc-cta',
        type: 'button',
        props: {
          text: 'Shop Season 04 Drop',
          url: 'https://example.com/collection',
          backgroundColor: '#18181B',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'nc-divider', type: 'divider', props: { color: '#E4E4E7' } },
      { id: 'nc-social', type: 'social_links', props: {} },
      { id: 'nc-footer', type: 'footer', props: {} },
      { id: 'nc-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

