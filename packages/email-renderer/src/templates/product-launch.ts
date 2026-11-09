import { TemplateDefinition } from '../types/template.types.js';

export const productLaunchTemplate: TemplateDefinition = {
  name: 'Product Launch',
  slug: 'product-launch',
  category: 'product_launches',
  thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  description: 'Hero-driven flagship hardware and product reveal with spec breakdowns, engineering deep dives, and early-bird pre-order CTAs.',
  features: ['Large flagship product hero', 'Key engineering feature breakdown', 'Early-bird product card', 'High-conversion pre-order CTA'],
  recommendedFor: 'Hardware unveilings, new device pre-orders, flagship merchandise, and innovative consumer tech.',
  isActive: true,
  isPremium: false,
  version: 1,
  editorSchema: {
    templateId: 'product-launch',
    version: 1,
    settings: {
      background: '#F8FAFC',
      contentWidth: 600,
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      textColor: '#0F172A',
    },
    blocks: [
      {
        id: 'prod-badge',
        type: 'discount_badge',
        props: {
          text: 'OFFICIAL PRODUCT UNVEILING',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'prod-logo',
        type: 'logo',
        props: {
          alignment: 'center',
          width: 140,
          padding: '24px 32px 16px',
        },
      },
      {
        id: 'prod-hero',
        type: 'hero',
        props: {
          title: 'Meet the All-New Pro Edition.',
          subtitle: 'Re-engineered from the ground up with custom silicon to elevate every detail of your acoustic experience.',
          backgroundColor: '#EEF2FF',
          titleColor: '#312E81',
          subtitleColor: '#4338CA',
          padding: '40px 32px',
        },
      },
      {
        id: 'prod-image',
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
          alt: 'Flagship Wireless Headphones Studio Reveal',
          caption: 'Aerospace-grade anodized aluminum construction with memory foam acoustics',
          borderRadius: 8,
          padding: '16px 32px',
        },
      },
      {
        id: 'prod-para-intro',
        type: 'paragraph',
        props: {
          text: 'Hey {{first_name}},\n\nAfter two years of confidential engineering, acoustic testing, and prototyping, the Pro Edition is finally here. We engineered every single acoustic driver to deliver studio-master precision right to your ears.',
          fontSize: 15,
          lineHeight: 1.6,
        },
      },
      {
        id: 'prod-heading-specs',
        type: 'heading',
        props: {
          text: 'Engineered Without Compromise:',
          level: 'h3',
          color: '#312E81',
        },
      },
      {
        id: 'prod-para-specs',
        type: 'paragraph',
        props: {
          text: '✦ Custom 45mm Bio-Cellulose Drivers for distortion-free sound\n✦ Adaptive Active Noise Cancellation with Transparency Mode\n✦ Up to 40 Hours Continuous Battery Life on a single 30-min charge\n✦ Seamless Ultra-Low Latency Lossless Bluetooth 5.4 Audio',
          fontSize: 14,
          lineHeight: 1.8,
          color: '#334155',
        },
      },
      {
        id: 'prod-card',
        type: 'product_card',
        props: {
          title: 'Pro Edition Wireless Flagship',
          price: '$349.00',
          originalPrice: '$399.00',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          description: 'Includes handcrafted magnetic carrying case, 3.5mm braided cable, and USB-C rapid charger.',
          buttonText: 'Pre-Order Early Bird ($50 Off)',
          url: 'https://example.com/preorder',
        },
      },
      {
        id: 'prod-cta',
        type: 'button',
        props: {
          text: 'EXPLORE FULL TECHNICAL SPECS',
          url: 'https://example.com/specs',
          backgroundColor: '#4F46E5',
          textColor: '#FFFFFF',
          borderRadius: 6,
        },
      },
      {
        id: 'prod-divider',
        type: 'divider',
        props: {
          color: '#C7D2FE',
        },
      },
      {
        id: 'prod-social',
        type: 'social_links',
        props: {},
      },
      {
        id: 'prod-footer',
        type: 'footer',
        props: {},
      },
      {
        id: 'prod-unsub',
        type: 'unsubscribe',
        props: {},
      },
    ],
  },
};

