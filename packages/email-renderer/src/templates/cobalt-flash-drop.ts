import { TemplateDefinition } from '../types/template.types.js';

export const cobaltFlashDropTemplate: TemplateDefinition = {
  name: 'Cobalt Flash Drop',
  slug: 'cobalt-flash-drop',
  category: 'discounts',
  thumbnail: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800&auto=format&fit=crop&q=80',
  description: 'High-contrast cobalt and obsidian promotional campaign with clean urgency bar, bold promo code card, and side-by-side product picks.',
  features: ['Cobalt urgency banner', 'Obsidian flash hero', 'Verified DROP40 coupon block', '2-column product grid'],
  recommendedFor: 'Private subscriber archive sales, 48-hour drops, sneaker/tech promos, and seasonal markdowns.',
  isActive: true,
  isPremium: false,
  version: 2,
  editorSchema: {
    templateId: 'cobalt-flash-drop',
    version: 2,
    settings: {
      background: '#EFF6FF',
      contentWidth: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'cfd-bar',
        type: 'announcement_bar',
        props: {
          text: 'PRIVATE ARCHIVE DROP • ENDS SUNDAY AT 11:59 PM',
          backgroundColor: '#2563EB',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'cfd-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 136,
          padding: '22px 32px 10px',
        },
      },
      {
        id: 'cfd-badge',
        type: 'discount_badge',
        props: {
          text: 'UP TO 40% OFF ARCHIVE PICKS',
          backgroundColor: '#DBEAFE',
          textColor: '#1D4ED8',
          padding: '6px 32px 14px',
        },
      },
      {
        id: 'cfd-hero',
        type: 'hero',
        props: {
          title: '48 Hours Only. Vault Prices Unlocked.',
          subtitle: 'Limited quantities across our top studio essentials—available exclusively to subscribers before public clearance.',
          backgroundColor: '#0F172A',
          titleColor: '#FFFFFF',
          subtitleColor: '#94A3B8',
          alignment: 'center',
          padding: '40px 32px',
        },
      },
      {
        id: 'cfd-coupon',
        type: 'coupon',
        props: {
          code: 'DROP40',
          discount: '40% OFF SITEWIDE',
          description: 'Paste at checkout for instant savings on archive items.',
          backgroundColor: '#EFF6FF',
          borderColor: '#2563EB',
        },
      },
      {
        id: 'cfd-grid',
        type: 'product_grid',
        props: {
          products: [
            {
              title: 'Aero Studio Runner',
              price: '$108',
              originalPrice: '$180',
              imageUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800&auto=format&fit=crop&q=80',
              buttonText: 'Claim Pair',
              url: 'https://example.com/runner',
            },
            {
              title: 'Pro Acoustic Headphones',
              price: '$239',
              originalPrice: '$399',
              imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
              buttonText: 'Claim Set',
              url: 'https://example.com/audio',
            },
          ],
        },
      },
      {
        id: 'cfd-cta',
        type: 'button',
        props: {
          text: 'Unlock Archive Sale Now',
          url: 'https://example.com/vault',
          backgroundColor: '#2563EB',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'cfd-divider', type: 'divider', props: { color: '#DBEAFE' } },
      { id: 'cfd-social', type: 'social_links', props: {} },
      { id: 'cfd-footer', type: 'footer', props: {} },
      { id: 'cfd-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

