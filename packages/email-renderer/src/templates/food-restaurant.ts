import { TemplateDefinition } from '../types/template.types.js';

export const foodRestaurantTemplate: TemplateDefinition = {
  name: 'Food & Restaurant',
  slug: 'food-restaurant',
  category: 'food',
  thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
  description: 'Mouthwatering culinary layout featuring farm-to-table imagery, tasting menu highlights, and appetizing discount vouchers.',
  features: ['Culinary photography layout', 'Chef tasting specials card', 'Free appetizer voucher', 'Direct reservation CTA'],
  recommendedFor: 'Bistros, fine dining, pizzerias, cafes, food delivery platforms, and artisan bakeries.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'food-restaurant',
    version: 1,
    settings: {
      background: '#FFF7ED',
      contentWidth: 600,
      fontFamily: "'Source Sans Pro', 'Lucida Sans Unicode', -apple-system, sans-serif",
      textColor: '#431407',
    },
    blocks: [
      {
        id: 'food-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 160,
          padding: '24px 32px 16px',
        },
      },
      {
        id: 'food-hero',
        type: 'hero',
        props: {
          title: 'Taste the Woodfired Difference.',
          subtitle: 'Artisanal Italian heritage dishes made from locally harvested organic heirloom produce.',
          backgroundColor: '#431407',
          titleColor: '#FFEDD5',
          subtitleColor: '#FED7AA',
          padding: '36px 32px',
        },
      },
      {
        id: 'food-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
          alt: 'Artisanal Woodfired Specialty Bowl',
          caption: 'Freshly rolled daily by our master pasta makers',
          borderRadius: 8,
          padding: '16px 32px',
        },
      },
      {
        id: 'food-heading',
        type: 'heading',
        props: {
          text: "Chef's Tasting Specials This Weekend",
          level: 'h2',
          alignment: 'center',
          color: '#9A3412',
        },
      },
      {
        id: 'food-para',
        type: 'paragraph',
        props: {
          text: 'Buon appetito, {{first_name}}!\n\nThis weekend our culinary team is unveiling our limited Autumn Harvest menu, pairing truffled burrata pasta with hand-selected natural wines from Tuscany.',
          alignment: 'center',
          fontSize: 15,
          lineHeight: 1.6,
        },
      },
      {
        id: 'food-product',
        type: 'product_card',
        props: {
          title: 'Handmade Truffle Tagliolini & Burrata',
          price: '$26.00',
          originalPrice: '$32.00',
          imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80',
          description: 'Shaved black truffles, aged 24-month Parmigiano Reggiano, creamy Puglia burrata.',
          buttonText: 'Reserve Your Table',
          url: 'https://example.com/reserve',
        },
      },
      {
        id: 'food-coupon',
        type: 'coupon',
        props: {
          code: 'TASTINGVOUCHER',
          discount: 'COMPLIMENTARY ANTIPASTO',
          description: 'Show this voucher to your server with any party order of 2 or more entrées.',
          backgroundColor: '#FFEDD5',
          borderColor: '#EA580C',
        },
      },
      {
        id: 'food-cta',
        type: 'button',
        props: {
          text: 'RESERVE TABLE / ORDER ONLINE',
          url: 'https://example.com/order',
          backgroundColor: '#C2410C',
          textColor: '#FFFFFF',
          borderRadius: 8,
        },
      },
      {
        id: 'food-divider',
        type: 'divider',
        props: {
          color: '#FED7AA',
        },
      },
      {
        id: 'food-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'food-footer',
        type: 'footer',
        props: {
          address: '450 Little Italy Way, Suite 12, San Francisco, CA 94133',
        },
      },
      {
        id: 'food-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

