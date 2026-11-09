import { TemplateDefinition } from '../types/template.types.js';

export const flashSaleTemplate: TemplateDefinition = {
  name: 'Flash Sale',
  slug: 'flash-sale',
  category: 'discounts',
  thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  description: 'High-contrast urgency design with electric yellow accents, large discount countdown reminder, and bold full-width action button.',
  features: ['High-urgency contrast design', '24-hour flash countdown banner', 'Prominent coupon block', 'Full-width action button'],
  recommendedFor: 'Time-limited promotions, Black Friday, Cyber Monday, midnight drop sales, and clearance events.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'flash-sale',
    version: 1,
    settings: {
      background: '#18181B',
      contentWidth: 600,
      fontFamily: "'Arial Black', 'Impact', -apple-system, sans-serif",
      textColor: '#FAFAFA',
    },
    blocks: [
      {
        id: 'flash-badge',
        type: 'discount_badge',
        props: {
          text: '⚡ 24 HOURS ONLY — FINAL WARNING ⚡',
          backgroundColor: '#EF4444',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'flash-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 150,
          padding: '16px 32px 12px',
        },
      },
      {
        id: 'flash-hero',
        type: 'hero',
        props: {
          title: 'TICK TOCK. 60% OFF SITEWIDE.',
          subtitle: 'The countdown has begun. Once midnight strikes, every item returns to full retail price permanently.',
          backgroundColor: '#27272A',
          titleColor: '#FACC15',
          subtitleColor: '#E4E4E7',
          padding: '36px 28px',
        },
      },
      {
        id: 'flash-coupon',
        type: 'coupon',
        props: {
          code: 'FLASH60',
          discount: 'INSTANT 60% SAVINGS',
          description: 'Valid sitewide on orders over $35. Discount code automatically applies at checkout.',
          backgroundColor: '#27272A',
          borderColor: '#FACC15',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'flash-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800&auto=format&fit=crop&q=80',
          alt: 'Urgent Flash Sale Warehouse Event',
          caption: 'Over 850+ items currently in stock — selling out fast',
          borderRadius: 8,
          padding: '12px 28px',
        },
      },
      {
        id: 'flash-para',
        type: 'paragraph',
        props: {
          text: '{{first_name}}, this is not a drill! Thousands of shoppers are currently in checkout queues. High-demand items are vanishing by the minute. Secure your cart before it sells out.',
          alignment: 'center',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#E4E4E7',
        },
      },
      {
        id: 'flash-cta',
        type: 'button',
        props: {
          text: 'CLAIM YOUR 60% SAVINGS NOW',
          url: 'https://example.com/flash',
          backgroundColor: '#EF4444',
          textColor: '#FFFFFF',
          borderRadius: 4,
          fullWidth: true,
        },
      },
      {
        id: 'flash-divider',
        type: 'divider',
        props: {
          color: '#3F3F46',
        },
      },
      {
        id: 'flash-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'flash-footer',
        type: 'footer',
        props: {
          borderTop: '1px solid #3F3F46',
        },
      },
      {
        id: 'flash-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

