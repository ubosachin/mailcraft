import { TemplateDefinition } from '../types/template.types.js';

export const colorfulSaleTemplate: TemplateDefinition = {
  name: 'Colorful Sale',
  slug: 'colorful-sale',
  category: 'discounts',
  thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
  description: 'High-energy vibrant layout with bold discount headlines, promotional banners, and prominent coupon blocks.',
  features: ['Vibrant color scheme', 'High-contrast discount badge', 'Coupon code block', 'Full-width action button'],
  recommendedFor: 'Seasonal sales, holiday blowouts, ecommerce promotions, and consumer brands.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'colorful-sale',
    version: 1,
    settings: {
      background: '#EEF2FF',
      contentWidth: 600,
      fontFamily: "'Trebuchet MS', 'Lucida Sans Unicode', 'Segoe UI', sans-serif",
      textColor: '#1E1B4B',
    },
    blocks: [
      {
        id: 'color-badge',
        type: 'discount_badge',
        props: {
          text: '⚡ MEGA MID-SEASON EVENT ⚡',
          backgroundColor: '#EF4444',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'color-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 150,
          padding: '16px 32px 16px',
        },
      },
      {
        id: 'color-hero',
        type: 'hero',
        props: {
          title: 'UP TO 50% OFF SITEWIDE',
          subtitle: 'The biggest prices drops of the year have officially arrived. Stock is limited.',
          backgroundColor: '#4F46E5',
          titleColor: '#FFFFFF',
          subtitleColor: '#C7D2FE',
          padding: '36px 28px',
        },
      },
      {
        id: 'color-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
          alt: 'Colorful Lifestyle Accessories',
          caption: 'Special summer colorways now 50% off',
          borderRadius: 8,
          padding: '16px 28px',
        },
      },
      {
        id: 'color-para',
        type: 'paragraph',
        props: {
          text: 'Hey {{first_name}}! All your favorite gear, newly released colorways, and bundles are discounted for 72 hours only. Grab what you need before inventory runs dry!',
          alignment: 'center',
          fontSize: 16,
          lineHeight: 1.6,
        },
      },
      {
        id: 'color-coupon',
        type: 'coupon',
        props: {
          code: 'COLOR50',
          discount: 'EXTRA 50% OFF AT CHECKOUT',
          description: 'Enter code at checkout on eligible items. Minimum $40 order.',
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
        },
      },
      {
        id: 'color-cta',
        type: 'button',
        props: {
          text: 'SHOP THE MEGA SALE NOW',
          url: 'https://example.com/sale',
          backgroundColor: '#DC2626',
          textColor: '#FFFFFF',
          borderRadius: 8,
          fullWidth: true,
        },
      },
      {
        id: 'color-divider',
        type: 'divider',
        props: {
          color: '#E0E7FF',
        },
      },
      {
        id: 'color-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'color-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'color-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

