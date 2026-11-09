'use client';

import React from 'react';
import { IEditorBlock, IEditorSettings } from '@mailcraft/shared-types';

interface BlockRendererProps {
  block: IEditorBlock;
  brand: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  };
  settings: IEditorSettings;
  isSelected: boolean;
}

export function BlockRenderer({
  block,
  brand,
  settings,
}: BlockRendererProps) {
  const props = (block.props || block.data || {}) as Record<string, any>;
  const primaryColor = brand.primaryColor || '#4F46E5';

  switch (block.type) {
    case 'logo': {
      const logoUrl = brand.logoUrl || props.logoUrl || props.src;
      const brandName = brand.brandName || props.brandText || 'Your Brand';
      const width = Number(props.width) || 140;
      const align = props.alignment || 'center';
      const tagline = props.tagline || '';

      return (
        <div
          style={{
            padding: props.padding || '24px 20px 16px',
            textAlign: align,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={props.alt || brandName}
              style={{
                width: `${width}px`,
                maxWidth: '100%',
                height: 'auto',
                display: 'inline-block',
              }}
            />
          ) : (
            <div>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: primaryColor,
                  letterSpacing: '-0.5px',
                  display: 'inline-block',
                }}
              >
                {brandName}
              </span>
              {tagline && (
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  {tagline}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'hero': {
      const bg = props.backgroundColor || '#312E81';
      const titleColor = props.titleColor || '#FFFFFF';
      const subtitleColor = props.subtitleColor || '#C7D2FE';
      const align = props.alignment || 'center';

      return (
        <div
          style={{
            backgroundColor: bg,
            padding: props.padding || '40px 24px',
            textAlign: align,
            color: '#FFFFFF',
          }}
        >
          {props.image && (
            <img
              src={props.image}
              alt="Hero Banner"
              style={{
                width: '100%',
                maxHeight: '260px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            />
          )}
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: titleColor,
              margin: '0 0 12px 0',
              lineHeight: 1.25,
            }}
          >
            {props.title || 'Special Summer Sale'}
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: subtitleColor,
              margin: '0 0 20px 0',
              lineHeight: 1.6,
              maxWidth: '480px',
              display: 'inline-block',
            }}
          >
            {props.subtitle || 'Exclusive offers designed just for you.'}
          </p>
          {props.ctaText && (
            <div>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: props.ctaBg || '#FFFFFF',
                  color: props.ctaColor || '#1E1B4B',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '12px 24px',
                  borderRadius: '6px',
                }}
              >
                {props.ctaText}
              </span>
            </div>
          )}
        </div>
      );
    }

    case 'heading': {
      const align = props.alignment || 'center';
      const fontSize = `${props.fontSize || 24}px`;
      const color = props.color || settings.textColor || '#1E293B';

      return (
        <div
          style={{
            padding: props.padding || '20px 20px 8px',
            textAlign: align,
          }}
        >
          <div
            style={{
              fontSize,
              fontWeight: props.fontWeight || 800,
              color,
              lineHeight: 1.3,
            }}
          >
            {props.text || 'Heading Title'}
          </div>
        </div>
      );
    }

    case 'paragraph': {
      const align = props.alignment || 'center';
      const fontSize = `${props.fontSize || 15}px`;
      const color = props.color || settings.textColor || '#475569';
      const text = props.text || 'Body paragraph content...';

      return (
        <div
          style={{
            padding: props.padding || '8px 24px 16px',
            textAlign: align,
          }}
        >
          <div
            style={{
              fontSize,
              color,
              lineHeight: props.lineHeight || 1.6,
              whiteSpace: 'pre-line',
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    case 'image': {
      const align = props.alignment || 'center';
      const src =
        props.src ||
        props.image ||
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80';
      const width = props.width ? `${props.width}px` : '100%';
      const borderRadius = `${props.borderRadius || 8}px`;

      return (
        <div
          style={{
            padding: props.padding || '16px 20px',
            textAlign: align,
          }}
        >
          <img
            src={src}
            alt={props.alt || 'Promotional Image'}
            style={{
              width,
              maxWidth: '100%',
              height: 'auto',
              borderRadius,
              display: 'inline-block',
            }}
          />
          {props.caption && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
              {props.caption}
            </div>
          )}
        </div>
      );
    }

    case 'button': {
      const align = props.alignment || 'center';
      const bg = props.backgroundColor || primaryColor;
      const textColor = props.textColor || '#FFFFFF';
      const borderRadius = `${props.borderRadius ?? 8}px`;
      const fontSize = `${props.fontSize || 15}px`;

      return (
        <div
          style={{
            padding: props.padding || '16px 20px 24px',
            textAlign: align,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              backgroundColor: bg,
              color: textColor,
              fontSize,
              fontWeight: 700,
              padding: '13px 28px',
              borderRadius,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {props.text || 'Click Here'}
          </span>
        </div>
      );
    }

    case 'coupon': {
      const bg = props.backgroundColor || '#FEF3C7';
      const borderColor = props.borderColor || '#D97706';

      return (
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              backgroundColor: bg,
              border: `2px dashed ${borderColor}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#92400E',
                marginBottom: '8px',
              }}
            >
              {props.discount || '20% OFF YOUR ORDER'}
            </div>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#FFFFFF',
                border: '1px solid #F59E0B',
                color: '#B45309',
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 800,
                padding: '6px 18px',
                borderRadius: '6px',
                letterSpacing: '2px',
                marginBottom: '8px',
              }}
            >
              {props.code || 'SAVE20'}
            </div>
            {props.description && (
              <div style={{ fontSize: '12px', color: '#B45309' }}>
                {props.description}
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'discount_badge': {
      const bg = props.backgroundColor || '#EF4444';
      const textColor = props.textColor || '#FFFFFF';

      return (
        <div style={{ padding: '10px 16px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: bg,
              color: textColor,
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              padding: '6px 14px',
              borderRadius: '999px',
            }}
          >
            {props.text || 'LIMITED TIME OFFER'}
          </span>
        </div>
      );
    }

    case 'product_card': {
      const image =
        props.image ||
        'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80';

      return (
        <div style={{ padding: props.padding || '16px 20px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '16px',
              maxWidth: '360px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <img
              src={image}
              alt={props.title || 'Product'}
              style={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            />
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
              {props.title || 'Featured Product'}
            </div>
            <div style={{ margin: '6px 0 12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                {props.price || '$99.00'}
              </span>
              {props.strikePrice && (
                <span
                  style={{
                    fontSize: '13px',
                    color: '#94A3B8',
                    textDecoration: 'line-through',
                    marginLeft: '8px',
                  }}
                >
                  {props.strikePrice}
                </span>
              )}
            </div>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                padding: '9px 20px',
                borderRadius: '6px',
              }}
            >
              {props.buttonText || 'Shop Now'}
            </span>
          </div>
        </div>
      );
    }

    case 'product_grid': {
      return (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <img
                src={props.product1Image || 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80'}
                alt={props.product1Title || 'Product 1'}
                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginTop: '8px' }}>
                {props.product1Title || 'Item One'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: primaryColor, margin: '4px 0' }}>
                {props.product1Price || '$49.00'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <img
                src={props.product2Image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'}
                alt={props.product2Title || 'Product 2'}
                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginTop: '8px' }}>
                {props.product2Title || 'Item Two'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: primaryColor, margin: '4px 0' }}>
                {props.product2Price || '$39.00'}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'two_column': {
      return (
        <div style={{ padding: props.padding || '20px', backgroundColor: props.backgroundColor || 'transparent' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {props.col1Title || 'Left Column'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '8px' }}>
                {props.col1Text || 'Description text...'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: primaryColor }}>
                {props.col1LinkText || 'Learn More'} &rarr;
              </span>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {props.col2Title || 'Right Column'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '8px' }}>
                {props.col2Text || 'Description text...'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: primaryColor }}>
                {props.col2LinkText || 'Learn More'} &rarr;
              </span>
            </div>
          </div>
        </div>
      );
    }

    case 'image_text': {
      const isRight = props.imagePosition === 'right';
      return (
        <div style={{ padding: props.padding || '20px', backgroundColor: props.backgroundColor || '#FFFFFF' }}>
          <div style={{ display: 'flex', flexDirection: isRight ? 'row-reverse' : 'row', gap: '16px', alignItems: 'center' }}>
            <img
              src={props.imageSrc || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'}
              alt={props.heading || 'Featured'}
              style={{ width: '45%', borderRadius: '6px', objectFit: 'cover' }}
            />
            <div style={{ width: '55%' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                {props.heading || 'Crafted With Care'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '12px' }}>
                {props.text || 'Supporting editorial copy...'}
              </div>
              <span style={{ backgroundColor: primaryColor, color: '#FFFFFF', fontSize: '12px', fontWeight: 700, padding: '7px 14px', borderRadius: '6px' }}>
                {props.buttonText || 'Discover'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    case 'feature_section': {
      const features = Array.isArray(props.features) ? props.features : [];
      return (
        <div style={{ padding: props.padding || '24px 20px', backgroundColor: props.backgroundColor || '#F8FAFC' }}>
          {props.title && (
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: '16px' }}>
              {props.title}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(features.length ? features : [
              { icon: '✦', title: 'Precision Craft', description: 'Manufactured with aerospace tolerances.' },
              { icon: '🛡', title: 'Lifetime Guarantee', description: 'Zero hassle replacement.' },
            ]).map((f: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', gap: '12px' }}>
                <div style={{ fontSize: '18px' }}>{f.icon || '✦'}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{f.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'announcement_bar': {
      const bg = props.backgroundColor || primaryColor;
      const textColor = props.textColor || '#FFFFFF';

      return (
        <div
          style={{
            backgroundColor: bg,
            color: textColor,
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {props.text || 'FREE SHIPPING ON ORDERS OVER $75'}
          {props.linkText && (
            <span style={{ textDecoration: 'underline', marginLeft: '6px' }}>
              {props.linkText} &rarr;
            </span>
          )}
        </div>
      );
    }

    case 'divider': {
      const color = props.color || '#E2E8F0';
      return (
        <div style={{ padding: props.padding || '16px 20px' }}>
          <div style={{ height: '1px', backgroundColor: color, width: '100%' }} />
        </div>
      );
    }

    case 'spacer': {
      const height = props.height || 28;
      return (
        <div style={{ height: `${height}px`, backgroundColor: props.backgroundColor || 'transparent' }} />
      );
    }

    case 'social_links': {
      return (
        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', gap: '16px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
            <span>Twitter / X</span>
            <span>Instagram</span>
            <span>LinkedIn</span>
            <span>Website</span>
          </div>
        </div>
      );
    }

    case 'footer': {
      const senderName = brand.brandName || props.senderName || 'Our Company';
      const address = brand.footerAddress || props.address || '123 Innovation Way, Suite 100';

      return (
        <div
          style={{
            padding: '24px 20px 12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#64748B',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {senderName}
          </div>
          <div style={{ marginBottom: '6px' }}>{address}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            &copy; {new Date().getFullYear()} {senderName}. All rights reserved.
          </div>
        </div>
      );
    }

    case 'unsubscribe': {
      return (
        <div
          style={{
            padding: '12px 20px 24px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <span>You are receiving this email because you opted in at our website.</span>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: '#64748B', textDecoration: 'underline' }}>
              Unsubscribe from these emails
            </span>
          </div>
        </div>
      );
    }

    default:
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
          [Block: {block.type}]
        </div>
      );
  }
}

