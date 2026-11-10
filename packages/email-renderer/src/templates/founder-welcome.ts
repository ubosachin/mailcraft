import { TemplateDefinition } from '../types/template.types.js';

export const founderWelcomeTemplate: TemplateDefinition = {
  name: 'Studio Welcome Note',
  slug: 'founder-welcome',
  category: 'welcome',
  thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
  description: 'High-converting SaaS onboarding letter with emerald welcome pill, crisp 3-step quickstart roadmap, and studio launch credit.',
  features: ['Emerald studio pill', 'Personal {{first_name}} greeting', '3-step quickstart cards', 'Onboarding coupon block'],
  recommendedFor: 'SaaS user onboarding, creator welcome emails, trial activation, and VIP workspace invites.',
  isActive: true,
  isPremium: false,
  version: 2,
  editorSchema: {
    templateId: 'founder-welcome',
    version: 2,
    settings: {
      background: '#F8FAFC',
      contentWidth: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'fw-badge',
        type: 'discount_badge',
        props: {
          text: 'WELCOME TO THE STUDIO',
          backgroundColor: '#ECFDF5',
          textColor: '#047857',
          alignment: 'center',
          padding: '24px 32px 6px',
        },
      },
      {
        id: 'fw-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 140,
          padding: '12px 32px 16px',
        },
      },
      {
        id: 'fw-hero',
        type: 'hero',
        props: {
          title: "You're In, {{first_name}}.",
          subtitle: 'Your workspace is provisioned and ready. Here is how top teams ship their first high-trust broadcast in under 5 minutes.',
          backgroundColor: '#F8FAFC',
          titleColor: '#0F172A',
          subtitleColor: '#475569',
          alignment: 'center',
          padding: '32px 32px',
        },
      },
      {
        id: 'fw-para',
        type: 'paragraph',
        props: {
          text: 'Thanks for joining us. We built this platform so growing brands never have to choose between enterprise deliverability and clean modern design.',
          alignment: 'left',
          fontSize: 15,
          lineHeight: 1.7,
        },
      },
      {
        id: 'fw-steps',
        type: 'feature_section',
        props: {
          title: 'Your 3-Minute Quickstart',
          backgroundColor: '#F8FAFC',
          padding: '24px 24px',
          features: [
            {
              icon: '1',
              title: 'Connect Sending Domain or Gmail',
              description: 'Verify your sender address with OAuth, App Password, Brevo, or Amazon SES.',
            },
            {
              icon: '2',
              title: 'Import Verified Recipients',
              description: 'Upload clean opt-in lists with instant duplicate and syntax hygiene.',
            },
            {
              icon: '3',
              title: 'Customize & Launch Campaign',
              description: 'Pick any responsive studio design and preview desktop + mobile before dispatch.',
            },
          ],
        },
      },
      {
        id: 'fw-coupon',
        type: 'coupon',
        props: {
          code: 'STUDIO25',
          discount: '25% OFF PRO PLAN',
          description: 'Apply your founder welcome credit anytime during your first 14 days.',
          backgroundColor: '#EEF2FF',
          borderColor: '#4F46E5',
        },
      },
      {
        id: 'fw-cta',
        type: 'button',
        props: {
          text: 'Open Your Workspace',
          url: 'https://example.com/workspace',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'fw-divider', type: 'divider', props: { color: '#E2E8F0' } },
      { id: 'fw-social', type: 'social_links', props: {} },
      { id: 'fw-footer', type: 'footer', props: {} },
      { id: 'fw-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

