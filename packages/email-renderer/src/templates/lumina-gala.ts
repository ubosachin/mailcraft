import { TemplateDefinition } from '../types/template.types.js';

export const luminaGalaTemplate: TemplateDefinition = {
  name: 'Solstice VIP Celebration',
  slug: 'lumina-gala',
  category: 'festivals',
  thumbnail: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&auto=format&fit=crop&q=80',
  description: 'Refined emerald and mint seasonal celebration template with complimentary gift-wrapping notice, curated story split, and VIP holiday voucher.',
  features: ['Emerald & mint header palette', 'Curated gift story split', 'Seasonal VIP voucher', 'Rounded emerald CTA'],
  recommendedFor: 'Holiday client gifting, festive brand campaigns, New Year customer thank-yous, and VIP seasonal offers.',
  isActive: true,
  isPremium: false,
  version: 2,
  editorSchema: {
    templateId: 'lumina-gala',
    version: 2,
    settings: {
      background: '#ECFDF5',
      contentWidth: 600,
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      textColor: '#064E3B',
    },
    blocks: [
      {
        id: 'lg-bar',
        type: 'announcement_bar',
        props: {
          text: 'COMPLIMENTARY SIGNATURE GIFT WRAPPING ON SEASONAL SETS',
          backgroundColor: '#064E3B',
          textColor: '#D1FAE5',
        },
      },
      {
        id: 'lg-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 138,
          padding: '24px 32px 12px',
        },
      },
      {
        id: 'lg-hero',
        type: 'hero',
        props: {
          title: 'Celebrate The Season In Warmth.',
          subtitle: 'Hand-packed seasonal editions and keepsake gift boxes curated for clients, founders, and close friends.',
          backgroundColor: '#064E3B',
          titleColor: '#FFFFFF',
          subtitleColor: '#A7F3D0',
          alignment: 'center',
          padding: '40px 32px',
        },
      },
      {
        id: 'lg-split',
        type: 'image_text',
        props: {
          imageSrc: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&auto=format&fit=crop&q=80',
          heading: 'Thoughtful Keepsake Editions',
          text: 'Every gift box includes handwritten note cards, recyclable linen ribbon packaging, and guaranteed holiday courier tracking.',
          buttonText: 'Browse Gift Guide',
          buttonUrl: 'https://example.com/gifts',
          imagePosition: 'left',
        },
      },
      {
        id: 'lg-coupon',
        type: 'coupon',
        props: {
          code: 'SOLSTICE30',
          discount: '30% OFF GIFT EDITIONS',
          description: 'Reserved for returning members and corporate gifting orders placed this week.',
          backgroundColor: '#ECFDF5',
          borderColor: '#059669',
        },
      },
      {
        id: 'lg-cta',
        type: 'button',
        props: {
          text: 'Shop Holiday Collection',
          url: 'https://example.com/holiday',
          backgroundColor: '#059669',
          textColor: '#FFFFFF',
          borderRadius: 99,
          alignment: 'center',
        },
      },
      { id: 'lg-divider', type: 'divider', props: { color: '#A7F3D0' } },
      { id: 'lg-social', type: 'social_links', props: {} },
      { id: 'lg-footer', type: 'footer', props: {} },
      { id: 'lg-unsub', type: 'unsubscribe', props: {} },
    ],
  },
};

