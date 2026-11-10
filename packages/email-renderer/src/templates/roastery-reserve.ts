import { TemplateDefinition } from '../types/template.types.js';

export const roasteryReserveTemplate: TemplateDefinition = {
  name: 'Roastery Micro-Lot',
  slug: 'roastery-reserve',
  category: 'food',
  thumbnail: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
  description: 'Kinfolk-inspired artisan roastery and hospitality design with warm cream palette, harvest story split, tasting notes, and subscriber voucher.',
  features: ['Roasted-to-order top ribbon', 'Origin harvest image split', 'Tasting & brew spec cards', 'First-box discount coupon'],
  recommendedFor: 'Specialty coffee roasters, bakeries, craft food brands, and boutique dining subscriptions.',
  isActive: true,
  isPremium: false,
  version: 2,
  editorSchema: {
    templateId: 'roastery-reserve',
    version: 2,
    settings: {
      background: '#FEF7EE',
      contentWidth: 600,
      fontFamily: "'Inter', 'Georgia', sans-serif",
      textColor: '#451A03',
    },
    blocks: [
      {
        id: 'rr-bar',
        type: 'announcement_bar',
        props: {
          text: 'ROASTED TO ORDER EVERY TUESDAY • SINGLE-ORIGIN HARVEST',
          backgroundColor: '#78350F',
          textColor: '#FEF3C7',
        },
      },
      {
        id: 'rr-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 138,
          tagline: 'SMALL-BATCH MICRO-LOT RESERVE',
          padding: '24px 32px 10px',
        },
      },
      {
        id: 'rr-hero',
        type: 'hero',
        props: {
          title: 'Single-Origin Ethiopian Reserve.',
          subtitle: 'Delicate notes of bergamot blossom, wild honeycomb, and silky cacao finish—roasted fresh in 12kg batches.',
          backgroundColor: '#FEF7EE',
          titleColor: '#451A03',
          subtitleColor: '#78350F',
          alignment: 'center',
          padding: '32px 32px',
        },
      },
      {
        id: 'rr-split',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
          heading: 'Harvested at 2,150 Meters',
          text: 'Washed heirloom cherries sun-dried on raised African beds for 18 days, unlocking crystalline acidity and sweet floral aromatics.',
          buttonText: 'Read Origin Notes',
          buttonUrl: 'https://example.com/origin',
          imagePosition: 'right',
        },
      },
      {
        id: 'rr-notes',
        type: 'feature_section',
        props: {
          title: 'Tasting & Brew Guide',
          backgroundColor: '#FAF5EE',
          features: [
            {
              icon: '☕',
              title: 'Cupping Profile',
              description: 'White peach, bergamot tea, and golden cane sugar clarity.',
            },
            {
              icon: '🔥',
              title: 'Light Omni Roast',
              description: 'Balanced sweetness engineered for both pour-over and crisp espresso.',
            },
            {
              icon: '⏱',
              title: 'Optimal Recipe',
              description: '18g dose • 300ml water at 93°C • 2m 45s total brew time.',
            },
          ],
        },
      },
      {
        id: 'rr-coupon',
        type: 'coupon',
        props: {
          code: 'ROAST25',
          discount: '25% OFF FIRST TASTING BOX',
          description: 'Claim 25% off your inaugural bag or bi-weekly roaster dispatch.',
          backgroundColor: '#FFFBEB',
          borderColor: '#B45309',
        },
      },
      {
        id: 'rr-cta',
        type: 'button',
        props: {
          text: 'Claim Micro-Lot Reserve',
          url: 'https://example.com/coffee',
          backgroundColor: '#92400E',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'rr-divider', type: 'divider', props: { color: '#FDE68A' } },
      { id: 'rr-social', type: 'social_links', props: {} },
      { id: 'rr-footer', type: 'footer', props: {} },
      { id: 'rr-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

