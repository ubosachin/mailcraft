import { TemplateDefinition } from '../types/template.types.js';

export const obsidianChangelogTemplate: TemplateDefinition = {
  name: 'Obsidian Changelog',
  slug: 'obsidian-changelog',
  category: 'technology',
  thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
  description: 'Linear-inspired dark slate release notes with indigo badge, telemetry visual, benchmark metrics, and structured shipped highlights.',
  features: ['Obsidian dark hero header', '3 shipped feature cards', 'Two-column telemetry callouts', 'Rounded pill CTA'],
  recommendedFor: 'SaaS product updates, developer changelogs, AI platform releases, and engineering digests.',
  isActive: true,
  isPremium: true,
  version: 2,
  editorSchema: {
    templateId: 'obsidian-changelog',
    version: 2,
    settings: {
      background: '#F1F5F9',
      contentWidth: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'obs-bar',
        type: 'announcement_bar',
        props: {
          text: 'RELEASE v2.4 IS LIVE FOR ALL WORKSPACES',
          linkText: 'Read Full Notes',
          url: 'https://example.com/changelog',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'obs-hero',
        type: 'hero',
        props: {
          title: 'Ship Campaigns Twice As Fast.',
          subtitle: 'Introducing sub-50ms edge compilation, visual bento blocks, and live domain health diagnostics.',
          backgroundColor: '#0F172A',
          titleColor: '#FFFFFF',
          subtitleColor: '#94A3B8',
          alignment: 'left',
          padding: '44px 32px',
        },
      },
      {
        id: 'obs-logo',
        type: 'logo',
        props: {
          alignment: 'left',
          width: 132,
          tagline: 'Product & Engineering Changelog • Issue 24',
          padding: '24px 32px 12px',
        },
      },
      {
        id: 'obs-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
          alt: 'Real-time release analytics workspace telemetry',
          caption: 'Real-time open velocity and inbox placement radar',
          borderRadius: 12,
          padding: '12px 32px 20px',
        },
      },
      {
        id: 'obs-features',
        type: 'feature_section',
        props: {
          title: 'What Shipped in v2.4',
          backgroundColor: '#F8FAFC',
          padding: '28px 24px',
          features: [
            {
              icon: '⚡',
              title: 'Edge HTML Pre-Compiler',
              description: 'Responsive table layouts render 3.4x faster across Gmail, Apple Mail, and Outlook.',
            },
            {
              icon: '✦',
              title: 'Bento Block Primitives',
              description: 'Modular two-column stats, comparison highlights, and pill CTAs out of the box.',
            },
            {
              icon: '🛡',
              title: 'Continuous DMARC & SPF Guard',
              description: 'Automatic DNS verification alerts before a single campaign leaves the queue.',
            },
          ],
        },
      },
      {
        id: 'obs-metrics',
        type: 'two_column',
        props: {
          col1Title: '-64% Setup Time',
          col1Text: 'Clone production studio themes directly into any workspace draft in one click.',
          col1LinkText: 'Try Templates',
          col1Url: 'https://example.com/templates',
          col2Title: '99.4% Primary Inbox',
          col2Text: 'Built-in compliance checks and list hygiene before every high-volume dispatch.',
          col2LinkText: 'View Benchmarks',
          col2Url: 'https://example.com/benchmarks',
        },
      },
      {
        id: 'obs-cta',
        type: 'button',
        props: {
          text: 'Explore Release v2.4',
          url: 'https://example.com/release',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'obs-divider', type: 'divider', props: { color: '#E2E8F0' } },
      { id: 'obs-social', type: 'social_links', props: {} },
      { id: 'obs-footer', type: 'footer', props: {} },
      { id: 'obs-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

