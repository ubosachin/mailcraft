import { TemplateDefinition } from '../types/template.types.js';

export const bentoDigestTemplate: TemplateDefinition = {
  name: 'Bento Editorial Digest',
  slug: 'bento-digest',
  category: 'corporate',
  thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
  description: 'Notion-style warm slate newsletter featuring left-aligned editorial typography, spotlight essay card, and twin briefing tiles.',
  features: ['Editorial pill badge', 'Spotlight image + narrative split', 'Two-column bento stories', 'Monochrome pill CTA'],
  recommendedFor: 'Founder newsletters, weekly SaaS briefings, curated industry digests, and community roundups.',
  isActive: true,
  isPremium: false,
  version: 2,
  editorSchema: {
    templateId: 'bento-digest',
    version: 2,
    settings: {
      background: '#F8FAFC',
      contentWidth: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'bento-logo',
        type: 'logo',
        props: {
          alignment: 'left',
          width: 136,
          tagline: 'Weekly Signal & Strategy • Issue #42',
          padding: '28px 32px 12px',
        },
      },
      {
        id: 'bento-badge',
        type: 'discount_badge',
        props: {
          text: 'WEEKLY BRIEFING • 4 MIN READ',
          backgroundColor: '#EEF2FF',
          textColor: '#4338CA',
          alignment: 'left',
          padding: '8px 32px 10px',
        },
      },
      {
        id: 'bento-hero',
        type: 'hero',
        props: {
          title: 'The Quiet Shift in High-Trust Growth.',
          subtitle: 'Why modern product teams are replacing noisy blast funnels with craft-first lifecycle communication.',
          backgroundColor: '#F8FAFC',
          titleColor: '#0F172A',
          subtitleColor: '#475569',
          alignment: 'left',
          padding: '32px 32px',
        },
      },
      {
        id: 'bento-spotlight',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
          heading: 'Featured Essay: Design as Distribution',
          text: 'Teams that obsess over typography, crisp mobile framing, and clean domain hygiene earn 2.8x higher sustained reply rates.',
          buttonText: 'Read Essay',
          buttonUrl: 'https://example.com/essay',
          imagePosition: 'left',
          padding: '24px 20px',
        },
      },
      {
        id: 'bento-cols',
        type: 'two_column',
        props: {
          col1Title: '01. Design Tokens',
          col1Text: 'Unify brand colors, typography, and signature blocks across every automated workflow.',
          col1LinkText: 'Read Playbook',
          col1Url: 'https://example.com/tokens',
          col2Title: '02. Inbox Hygiene',
          col2Text: 'Automated suppression lists and disposable domain filtering keep bounce rates below 0.3%.',
          col2LinkText: 'See Checklist',
          col2Url: 'https://example.com/hygiene',
        },
      },
      {
        id: 'bento-cta',
        type: 'button',
        props: {
          text: 'Read Full Issue Online',
          url: 'https://example.com/issue-42',
          backgroundColor: '#0F172A',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'bento-divider', type: 'divider', props: { color: '#E2E8F0' } },
      { id: 'bento-social', type: 'social_links', props: {} },
      { id: 'bento-footer', type: 'footer', props: {} },
      { id: 'bento-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

