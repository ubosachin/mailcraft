import { TemplateDefinition } from '../types/template.types.js';

export const startupModernTemplate: TemplateDefinition = {
  name: 'Startup Modern',
  slug: 'startup-modern',
  category: 'corporate',
  thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80',
  description: 'Clean modern layout with mission introduction, product workflow visuals, velocity highlights, and trial activation CTA.',
  features: ['High-clarity value proposition', 'Workflow product preview', 'Customer velocity highlights', 'Friction-free trial CTA'],
  recommendedFor: 'Early-stage startups, modern productivity tools, B2B SaaS, and venture-backed tech products.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'startup-modern',
    version: 1,
    settings: {
      background: '#F8FAFC',
      contentWidth: 600,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'start-logo',
        type: 'logo',
        props: {
          alignment: 'left',
          width: 140,
          padding: '28px 32px 16px',
        },
      },
      {
        id: 'start-hero',
        type: 'hero',
        props: {
          title: 'The Future of Team Velocity is Here.',
          subtitle: 'Automate repetitive ops workflows and reclaim 12 valuable hours every team member every single week.',
          backgroundColor: '#F1F5F9',
          titleColor: '#0F172A',
          subtitleColor: '#475569',
          padding: '36px 32px',
        },
      },
      {
        id: 'start-para-1',
        type: 'paragraph',
        props: {
          text: 'Hi {{first_name}},\n\nTraditional project management was built for 2012 office setups. Today’s top performing teams operate asynchronously across continents. Our unified workspace brings clarity to that chaos.',
          fontSize: 15,
          lineHeight: 1.6,
        },
      },
      {
        id: 'start-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
          alt: 'Modern Collaborative Workspace Telemetry',
          caption: 'Real-time project velocity and automated task resolution',
          borderRadius: 8,
          padding: '16px 32px',
        },
      },
      {
        id: 'start-heading-highlights',
        type: 'heading',
        props: {
          text: 'Built For High-Velocity Teams:',
          level: 'h3',
          color: '#1E293B',
        },
      },
      {
        id: 'start-para-bullets',
        type: 'paragraph',
        props: {
          text: '✓ Instant Slack & GitHub sync with zero webhook configuration\n✓ AI-powered standup and retrospective generation\n✓ SOC 2 Type II certified enterprise bank-grade security',
          fontSize: 14,
          lineHeight: 1.8,
          color: '#334155',
        },
      },
      {
        id: 'start-cta',
        type: 'button',
        props: {
          text: 'START 14-DAY UNLIMITED TRIAL',
          url: 'https://example.com/trial',
          backgroundColor: '#2563EB',
          textColor: '#FFFFFF',
          borderRadius: 6,
        },
      },
      {
        id: 'start-divider',
        type: 'divider',
        props: {
          color: '#E2E8F0',
        },
      },
      {
        id: 'start-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'start-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'start-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

