import { TemplateDefinition } from '../types/template.types.js';

export const minimalPremiumTemplate: TemplateDefinition = {
  name: 'Minimal Premium',
  slug: 'minimal-premium',
  category: 'ecommerce',
  thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80',
  description: 'Understated luxury design with sophisticated typography, generous negative space, and refined CTA styling.',
  features: ['Minimalist layout', 'Editorial typography', 'Single hero CTA', 'Curated product card'],
  recommendedFor: 'Boutique ecommerce brands, architects, interior studios, and luxury goods.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'minimal-premium',
    version: 1,
    settings: {
      background: '#FAF9F6',
      contentWidth: 600,
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      textColor: '#1A1A1A',
    },
    blocks: [
      {
        id: 'min-logo',
        type: 'logo',
        props: {
          width: 140,
          alignment: 'center',
          padding: '32px 32px 20px',
        },
      },
      {
        id: 'min-hero',
        type: 'hero',
        props: {
          title: 'Refined Simplicity.',
          subtitle: 'Our newest curation celebrates intentional craftsmanship and enduring aesthetics.',
          backgroundColor: '#F5F3EF',
          titleColor: '#1A1A1A',
          subtitleColor: '#666666',
          padding: '36px 32px',
        },
      },
      {
        id: 'min-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
          alt: 'Artisanal Studio Objects',
          caption: 'Limited production run of 150 serialized pieces',
          borderRadius: 4,
          padding: '20px 32px',
        },
      },
      {
        id: 'min-para',
        type: 'paragraph',
        props: {
          text: 'Hello {{first_name}},\n\nWe believe the objects you surround yourself with should be crafted with purpose. Explore our limited curation before public release.',
          alignment: 'center',
          fontSize: 15,
          lineHeight: 1.7,
        },
      },
      {
        id: 'min-product',
        type: 'product_card',
        props: {
          title: 'Minimalist Leather Folio',
          price: '$185.00',
          originalPrice: '$220.00',
          imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
          buttonText: 'Acquire Piece',
          url: 'https://example.com/folio',
        },
      },
      {
        id: 'min-coupon',
        type: 'coupon',
        props: {
          code: 'MINIMAL15',
          discount: '15% OFF YOUR ORDER',
          description: 'Valid across our inaugural collection for the next 7 days.',
          backgroundColor: '#FFFFFF',
          borderColor: '#D4AF37',
        },
      },
      {
        id: 'min-cta',
        type: 'button',
        props: {
          text: 'Shop New Arrivals',
          url: 'https://example.com/collection',
          backgroundColor: '#111111',
          textColor: '#FFFFFF',
          borderRadius: 2,
          alignment: 'center',
        },
      },
      {
        id: 'min-divider',
        type: 'divider',
        props: {
          color: '#E8E4DD',
        },
      },
      {
        id: 'min-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'min-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'min-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

