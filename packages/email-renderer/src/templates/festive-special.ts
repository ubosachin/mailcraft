import { TemplateDefinition } from '../types/template.types.js';

export const festiveSpecialTemplate: TemplateDefinition = {
  name: 'Festive Special',
  slug: 'festive-special',
  category: 'festivals',
  thumbnail: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&auto=format&fit=crop&q=80',
  description: 'Warm festive palette of rich crimson, amber, and gold with celebratory greeting, decorative banners, and gift coupons.',
  features: ['Festive amber & crimson tones', 'Celebratory greeting', 'Gift hamper coupon', 'Rounded celebratory CTA'],
  recommendedFor: 'Holiday shopping, Diwali, Christmas, New Year, Lunar New Year, and festive occasions.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'festive-special',
    version: 1,
    settings: {
      background: '#FFFBEB',
      contentWidth: 600,
      fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
      textColor: '#451A03',
    },
    blocks: [
      {
        id: 'fest-badge',
        type: 'discount_badge',
        props: {
          text: '✨ FESTIVAL CELEBRATION SPECIAL ✨',
          backgroundColor: '#B45309',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'fest-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 150,
          padding: '20px 32px 14px',
        },
      },
      {
        id: 'fest-hero',
        type: 'hero',
        props: {
          title: 'May Your Days Be Filled With Joy & Light',
          subtitle: 'Handcrafted gifts, festive treats, and heartwarming surprises for everyone on your list.',
          backgroundColor: '#78350F',
          titleColor: '#FDE68A',
          subtitleColor: '#FEF3C7',
          padding: '40px 32px',
        },
      },
      {
        id: 'fest-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?w=800&auto=format&fit=crop&q=80',
          alt: 'Warm Festive Lights and Celebrations',
          caption: 'Special festive gift hampers with complimentary gift wrapping',
          borderRadius: 8,
          padding: '18px 32px',
        },
      },
      {
        id: 'fest-para',
        type: 'paragraph',
        props: {
          text: 'Dearest {{first_name}},\n\nDuring this joyful season of gathering and gratitude, we celebrate the warmth of community. To thank you for being a cherished part of our journey, enjoy an exclusive festive treat on your celebration shopping.',
          alignment: 'center',
          fontSize: 16,
          lineHeight: 1.7,
        },
      },
      {
        id: 'fest-coupon',
        type: 'coupon',
        props: {
          code: 'FESTIVE25',
          discount: '25% OFF FESTIVE GIFT HAMPERS',
          description: 'Includes complimentary handwritten greeting card and express insured delivery.',
          backgroundColor: '#FEF3C7',
          borderColor: '#D97706',
        },
      },
      {
        id: 'fest-cta',
        type: 'button',
        props: {
          text: 'EXPLORE FESTIVE COLLECTION',
          url: 'https://example.com/festive',
          backgroundColor: '#B45309',
          textColor: '#FFFFFF',
          borderRadius: 24,
        },
      },
      {
        id: 'fest-divider',
        type: 'divider',
        props: {
          color: '#FCD34D',
        },
      },
      {
        id: 'fest-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'fest-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'fest-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

