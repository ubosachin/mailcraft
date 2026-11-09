import { TemplateDefinition } from '../types/template.types.js';

export const corporateTemplate: TemplateDefinition = {
  name: 'Corporate',
  slug: 'corporate',
  category: 'corporate',
  thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
  description: 'Structured enterprise briefing layout with executive announcements, milestone metrics, and corporate contact details.',
  features: ['Crisp business typography', 'Executive briefing structure', 'Strategic initiatives list', 'Formal report download CTA'],
  recommendedFor: 'Enterprise B2B, investor updates, corporate communications, advisory firms, and shareholder reports.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'corporate',
    version: 1,
    settings: {
      background: '#F1F5F9',
      contentWidth: 600,
      fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'corp-logo',
        type: 'logo',
        props: {
          alignment: 'left',
          width: 150,
          padding: '28px 32px 16px',
        },
      },
      {
        id: 'corp-heading-main',
        type: 'heading',
        props: {
          text: 'Quarterly Executive & Strategic Briefing',
          level: 'h1',
          color: '#1E3A8A',
          padding: '16px 32px 4px',
        },
      },
      {
        id: 'corp-divider-1',
        type: 'divider',
        props: {
          color: '#3B82F6',
          thickness: 2,
          padding: '8px 32px 16px',
        },
      },
      {
        id: 'corp-para-intro',
        type: 'paragraph',
        props: {
          text: 'Dear Valued Partners and Clients,\n\nWe are pleased to provide our official summary of key milestones, operational performance, and strategic initiatives completed across the organisation during the past fiscal quarter.',
          fontSize: 15,
          lineHeight: 1.6,
        },
      },
      {
        id: 'corp-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
          alt: 'Corporate Global Headquarters',
          caption: 'Global Operations Review — Fiscal Year Performance Update',
          borderRadius: 6,
          padding: '16px 32px',
        },
      },
      {
        id: 'corp-heading-initiatives',
        type: 'heading',
        props: {
          text: 'Key Strategic Highlights:',
          level: 'h3',
          color: '#1E40AF',
        },
      },
      {
        id: 'corp-para-initiatives',
        type: 'paragraph',
        props: {
          text: '1. Regional Infrastructure Expansion: Commissioned two new sovereign data regions in Frankfurt and Singapore.\n2. Governance & Security: Completed comprehensive SOC 2 Type II and ISO 27001 recertifications.\n3. Operational Resilience: Maintained uninterrupted 99.995% uptime across client production systems.',
          fontSize: 14,
          lineHeight: 1.8,
          color: '#334155',
        },
      },
      {
        id: 'corp-cta',
        type: 'button',
        props: {
          text: 'DOWNLOAD EXECUTIVE REPORT (PDF)',
          url: 'https://example.com/reports/quarterly',
          backgroundColor: '#1E40AF',
          textColor: '#FFFFFF',
          borderRadius: 4,
          alignment: 'left',
        },
      },
      {
        id: 'corp-divider-2',
        type: 'divider',
        props: {
          color: '#E2E8F0',
        },
      },
      {
        id: 'corp-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'corp-footer',
        type: 'footer',
        props: {
          address: 'Financial Center Tower 1, 100 Wall Street, New York, NY 10005',
        },
      },
      {
        id: 'corp-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

