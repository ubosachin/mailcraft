import { TemplateDefinition } from '../types/template.types.js';

export const luxuryBrandTemplate: TemplateDefinition = {
  name: 'Luxury Brand',
  slug: 'luxury-brand',
  category: 'fashion',
  thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80',
  description: 'Black, ivory, and gold palette with serif typography, bespoke editorial imagery, and intimate salon styling.',
  features: ['Black & gold luxury palette', 'Serif typography', 'Bespoke high-end imagery', 'Private salon invitation style'],
  recommendedFor: 'Haute couture, fine jewelry, luxury watches, private clubs, and high-end fragrance houses.',
  isActive: true,
  isPremium: true,
  version: 1,
  editorSchema: {
    templateId: 'luxury-brand',
    version: 1,
    settings: {
      background: '#0D0D0D',
      contentWidth: 620,
      fontFamily: "'Georgia', 'Times New Roman', serif",
      textColor: '#E6E1D6',
    },
    blocks: [
      {
        id: 'lux-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 170,
          padding: '40px 32px 16px',
        },
      },
      {
        id: 'lux-divider-1',
        type: 'divider',
        props: {
          color: '#D4AF37',
          thickness: 1,
          padding: '8px 48px',
        },
      },
      {
        id: 'lux-hero',
        type: 'hero',
        props: {
          title: "L'Automne Éternel.",
          subtitle: 'High jewelry and bespoke leather creations conceived in our private Parisian ateliers.',
          backgroundColor: '#171717',
          titleColor: '#D4AF37',
          subtitleColor: '#A39F93',
          padding: '44px 32px 32px',
        },
      },
      {
        id: 'lux-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
          alt: 'Couture Editorial Showcase',
          caption: 'Bespoke Atelier Collection — Hand-stitched in France',
          borderRadius: 2,
          padding: '16px 32px',
        },
      },
      {
        id: 'lux-para',
        type: 'paragraph',
        props: {
          text: 'Dear {{first_name}},\n\nA quiet evolution in form. You are cordially invited to schedule an intimate private viewing of our latest high-jewelry archive before it embarks on international exhibition.',
          alignment: 'center',
          fontSize: 16,
          lineHeight: 1.8,
          color: '#D1CCC0',
        },
      },
      {
        id: 'lux-product',
        type: 'product_card',
        props: {
          title: 'Sovereign 18K Gold & Onyx Pendant',
          price: '$2,850',
          originalPrice: '$3,400',
          imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80',
          buttonText: 'Request Private Salon Appointment',
          url: 'https://example.com/concierge',
        },
      },
      {
        id: 'lux-cta',
        type: 'button',
        props: {
          text: 'DISCOVER THE COUTURE ARCHIVE',
          url: 'https://example.com/archive',
          backgroundColor: '#D4AF37',
          textColor: '#0D0D0D',
          borderRadius: 0,
        },
      },
      {
        id: 'lux-divider-2',
        type: 'divider',
        props: {
          color: '#2A2A2A',
          padding: '24px 48px',
        },
      },
      {
        id: 'lux-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'lux-footer',
        type: 'footer',
        props: {
          address: '7 Place Vendôme, 75001 Paris, France',
          borderTop: '1px solid #222222',
        },
      },
      {
        id: 'lux-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

