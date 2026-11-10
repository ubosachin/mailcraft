import { TemplateDefinition } from '../types/template.types.js';

export const keynoteInviteTemplate: TemplateDefinition = {
  name: 'Live Keynote Invite',
  slug: 'keynote-invite',
  category: 'product_launches',
  thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
  description: 'Modern conference and product reveal invitation with deep violet hero, event schedule cards, speaker split, and one-click RSVP pill button.',
  features: ['Indigo keynote hero', 'Event imagery split', '3-part live agenda cards', 'Seat reservation pill CTA'],
  recommendedFor: 'Product launch keynotes, SaaS webinars, virtual summits, and VIP customer demos.',
  isActive: true,
  isPremium: true,
  version: 2,
  editorSchema: {
    templateId: 'keynote-invite',
    version: 2,
    settings: {
      background: '#EEF2FF',
      contentWidth: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'key-bar',
        type: 'announcement_bar',
        props: {
          text: 'LIVE PRODUCT REVEAL • THURSDAY • 10:00 AM PT / 1:00 PM ET',
          backgroundColor: '#4338CA',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'key-hero',
        type: 'hero',
        props: {
          title: 'The Next Chapter Starts Live.',
          subtitle: 'Join our founders and product engineers for a 45-minute keynote unveiling our fastest studio architecture yet.',
          backgroundColor: '#1E1B4B',
          titleColor: '#FFFFFF',
          subtitleColor: '#C7D2FE',
          alignment: 'center',
          padding: '44px 32px',
        },
      },
      {
        id: 'key-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 138,
          padding: '24px 32px 8px',
        },
      },
      {
        id: 'key-split',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
          heading: 'Interactive Demo + Open Q&A',
          text: 'No pre-recorded fluff. Watch live campaign builds, deliverability teardowns, and ask our engineering team directly.',
          buttonText: 'Add to Calendar',
          buttonUrl: 'https://example.com/calendar',
          imagePosition: 'left',
        },
      },
      {
        id: 'key-agenda',
        type: 'feature_section',
        props: {
          title: 'Keynote Agenda',
          backgroundColor: '#F8FAFC',
          features: [
            {
              icon: '🎙',
              title: '10:00 AM — State of Modern Email Craft',
              description: 'Keynote vision and roadmap for 2026 interactive and high-trust messaging.',
            },
            {
              icon: '⚡',
              title: '10:15 AM — Live Studio Architecture Demo',
              description: 'Building multi-channel campaigns with automated DNS & compliance verification.',
            },
            {
              icon: '🎁',
              title: '10:35 AM — Early Access Sandbox Keys',
              description: 'Every live attendee unlocks priority access to our upcoming release.',
            },
          ],
        },
      },
      {
        id: 'key-cta',
        type: 'button',
        props: {
          text: 'Reserve My Free Seat',
          url: 'https://example.com/rsvp',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'key-divider', type: 'divider', props: { color: '#E2E8F0' } },
      { id: 'key-social', type: 'social_links', props: {} },
      { id: 'key-footer', type: 'footer', props: {} },
      { id: 'key-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

