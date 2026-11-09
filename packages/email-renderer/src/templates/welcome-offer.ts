import { TemplateDefinition } from '../types/template.types.js';

export const welcomeOfferTemplate: TemplateDefinition = {
  name: 'Welcome Offer',
  slug: 'welcome-offer',
  category: 'welcome',
  thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
  description: 'Warm and inviting welcome message with personalized subscriber greeting, onboarding roadmap, and exclusive welcome voucher.',
  features: ['Friendly personal greeting', 'Exclusive welcome coupon', '3-step onboarding guide', 'Warm mint and emerald accents'],
  recommendedFor: 'New subscriber onboarding, lead generation welcome series, ecommerce welcome sequences, and club signups.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'welcome-offer',
    version: 1,
    settings: {
      background: '#F0FDF4',
      contentWidth: 600,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      textColor: '#14532D',
    },
    blocks: [
      {
        id: 'welc-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 140,
          padding: '28px 32px 16px',
        },
      },
      {
        id: 'welc-hero',
        type: 'hero',
        props: {
          title: 'Welcome to the Family, {{first_name}}!',
          subtitle: 'We are thrilled to have you with us. Here is an exclusive gift to kickstart your journey.',
          backgroundColor: '#DCFCE7',
          titleColor: '#166534',
          subtitleColor: '#15803D',
          padding: '36px 32px',
        },
      },
      {
        id: 'welc-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
          alt: 'Welcoming Warm Community Team',
          caption: 'Our passionate team is here to support you at every turn',
          borderRadius: 8,
          padding: '16px 32px',
        },
      },
      {
        id: 'welc-para-intro',
        type: 'paragraph',
        props: {
          text: 'Hello {{first_name}},\n\nThank you for opting in to our VIP insider community! You’ll now be the first to receive secret drops, community stories, and private discounts.',
          alignment: 'center',
          fontSize: 15,
          lineHeight: 1.6,
        },
      },
      {
        id: 'welc-coupon',
        type: 'coupon',
        props: {
          code: 'WELCOME20',
          discount: '20% OFF YOUR 1ST ORDER',
          description: 'Valid for the next 14 days on your entire shopping cart. Complimentary shipping included.',
          backgroundColor: '#F0FDF4',
          borderColor: '#16A34A',
          textColor: '#166534',
        },
      },
      {
        id: 'welc-heading-steps',
        type: 'heading',
        props: {
          text: '3 Ways to Get Started Today:',
          level: 'h3',
          color: '#166534',
        },
      },
      {
        id: 'welc-para-steps',
        type: 'paragraph',
        props: {
          text: '1. Explore our bestsellers and award-winning community favorites\n2. Copy your WELCOME20 coupon code to claim your 20% discount\n3. Reply directly to this email if you ever need personalized styling or product advice!',
          fontSize: 14,
          lineHeight: 1.8,
          color: '#166534',
        },
      },
      {
        id: 'welc-cta',
        type: 'button',
        props: {
          text: 'START EXPLORING WITH 20% OFF',
          url: 'https://example.com/welcome',
          backgroundColor: '#16A34A',
          textColor: '#FFFFFF',
          borderRadius: 8,
        },
      },
      {
        id: 'welc-divider',
        type: 'divider',
        props: {
          color: '#BBF7D0',
        },
      },
      {
        id: 'welc-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'welc-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'welc-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

