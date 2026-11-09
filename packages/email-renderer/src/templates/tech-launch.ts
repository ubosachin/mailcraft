import { TemplateDefinition } from '../types/template.types.js';

export const techLaunchTemplate: TemplateDefinition = {
  name: 'Tech Launch',
  slug: 'tech-launch',
  category: 'technology',
  thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  description: 'Futuristic slate layout with developer-focused feature hierarchy, architecture badges, and high-impact launch CTA.',
  features: ['Dark mode slate styling', 'Feature bullet highlights', 'Developer launch badge', 'High-contrast action button'],
  recommendedFor: 'SaaS platforms, developer tools, AI software, cloud infrastructure, and technical products.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'tech-launch',
    version: 1,
    settings: {
      background: '#0B0F19',
      contentWidth: 600,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      textColor: '#F1F5F9',
    },
    blocks: [
      {
        id: 'tech-badge',
        type: 'discount_badge',
        props: {
          text: 'V2.0 ARCHITECTURE RELEASE',
          backgroundColor: '#2563EB',
          textColor: '#FFFFFF',
          alignment: 'center',
        },
      },
      {
        id: 'tech-logo',
        type: 'logo',
        props: {
          alignment: 'left',
          width: 140,
          padding: '24px 32px 12px',
        },
      },
      {
        id: 'tech-hero',
        type: 'hero',
        props: {
          title: 'Say Hello to Speed Engine.',
          subtitle: 'The intelligent edge execution runtime built to eliminate latency and accelerate developer throughput.',
          backgroundColor: '#1E293B',
          titleColor: '#60A5FA',
          subtitleColor: '#94A3B8',
          padding: '36px 32px',
        },
      },
      {
        id: 'tech-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
          alt: 'Modern Cloud Architecture Interface',
          caption: 'Real-time telemetry and sub-millisecond query execution',
          borderRadius: 8,
          padding: '16px 32px',
        },
      },
      {
        id: 'tech-para-1',
        type: 'paragraph',
        props: {
          text: '{{first_name}}, after 14 months of closed engineering and benchmark testing with early design partners, our Next-Gen platform is officially open for production workloads.',
          fontSize: 15,
          lineHeight: 1.6,
          color: '#CBD5E1',
        },
      },
      {
        id: 'tech-heading-features',
        type: 'heading',
        props: {
          text: 'Why Engineering Teams Are Switching:',
          level: 'h3',
          color: '#93C5FD',
        },
      },
      {
        id: 'tech-para-bullets',
        type: 'paragraph',
        props: {
          text: '• 10x Faster Execution: Zero cold-start container initialization\n• Distributed Global Edge: 280+ POPs across 6 continents\n• Native TypeScript & Rust Support: Zero compilation overhead\n• Automatic Schema Migration: Zero-downtime database updates',
          fontSize: 14,
          lineHeight: 1.8,
          color: '#E2E8F0',
        },
      },
      {
        id: 'tech-cta',
        type: 'button',
        props: {
          text: 'DEPLOY IN 60 SECONDS — FREE',
          url: 'https://example.com/signup',
          backgroundColor: '#3B82F6',
          textColor: '#FFFFFF',
          borderRadius: 6,
        },
      },
      {
        id: 'tech-divider',
        type: 'divider',
        props: {
          color: '#334155',
        },
      },
      {
        id: 'tech-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'tech-footer',
        type: 'footer',
        props: {
          borderTop: '1px solid #334155',
        },
      },
      {
        id: 'tech-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

