'use client';

import React, { useState, useMemo } from 'react';
import {
  Heading,
  AlignLeft,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  MoveVertical,
  Crown,
  Share2,
  FileText,
  ShieldAlert,
  Sparkles,
  Ticket,
  BadgePercent,
  ShoppingBag,
  LayoutGrid,
  Columns,
  SplitSquareVertical,
  CheckCircle2,
  Megaphone,
  Search,
  Plus,
  GripVertical,
} from 'lucide-react';
import { EditorBlockType } from '@mailcraft/shared-types';

export interface BlockDefinition {
  type: EditorBlockType;
  title: string;
  category: 'basic' | 'brand' | 'marketing' | 'advanced';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultProps: Record<string, unknown>;
}

export const AVAILABLE_BLOCKS: BlockDefinition[] = [
  // --- BASIC ---
  {
    type: 'heading',
    title: 'Heading',
    category: 'basic',
    description: 'Prominent section title with customizable hierarchy and color.',
    icon: Heading,
    defaultProps: {
      text: 'New Seasonal Announcement',
      level: 'h2',
      fontSize: 26,
      fontWeight: 'bold',
      color: '#1E293B',
      alignment: 'center',
      padding: '24px 20px 8px',
    },
  },
  {
    type: 'paragraph',
    title: 'Paragraph',
    category: 'basic',
    description: 'Rich body text with dynamic variables and line-height control.',
    icon: AlignLeft,
    defaultProps: {
      text: 'Hello {{first_name}},\n\nWe are delighted to share our exclusive new collection tailored specifically for you.',
      fontSize: 15,
      color: '#475569',
      alignment: 'center',
      lineHeight: 1.6,
      padding: '8px 24px 20px',
    },
  },
  {
    type: 'image',
    title: 'Image',
    category: 'basic',
    description: 'High-resolution responsive image with alt text and destination link.',
    icon: ImageIcon,
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
      alt: 'Promotional Feature Image',
      width: 540,
      alignment: 'center',
      borderRadius: 8,
      padding: '16px 20px',
      url: 'https://example.com',
    },
  },
  {
    type: 'button',
    title: 'Button',
    category: 'basic',
    description: 'Bulletproof table CTA button styled for Outlook and mobile clients.',
    icon: MousePointerClick,
    defaultProps: {
      text: 'Shop The Collection',
      url: 'https://example.com/shop',
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
      fontSize: 15,
      borderRadius: 8,
      alignment: 'center',
      padding: '16px 20px 24px',
    },
  },
  {
    type: 'divider',
    title: 'Divider',
    category: 'basic',
    description: 'Clean horizontal rule separating content sections.',
    icon: Minus,
    defaultProps: {
      color: '#E2E8F0',
      thickness: 1,
      padding: '16px 24px',
    },
  },
  {
    type: 'spacer',
    title: 'Spacer',
    category: 'basic',
    description: 'Adjustable vertical white space between layout blocks.',
    icon: MoveVertical,
    defaultProps: {
      height: 28,
      backgroundColor: 'transparent',
    },
  },

  // --- BRAND ---
  {
    type: 'logo',
    title: 'Brand Header / Logo',
    category: 'brand',
    description: 'Brand identity with auto-suggested brand assets and tagline.',
    icon: Crown,
    defaultProps: {
      alignment: 'center',
      width: 140,
      padding: '24px 20px 16px',
      tagline: '',
    },
  },
  {
    type: 'social_links',
    title: 'Social Links',
    category: 'brand',
    description: 'Standardized social media icons linking to your social profiles.',
    icon: Share2,
    defaultProps: {
      alignment: 'center',
      iconSize: 24,
      padding: '16px 20px',
    },
  },
  {
    type: 'footer',
    title: 'Email Footer',
    category: 'brand',
    description: 'Sender physical business address and copyright disclaimer.',
    icon: FileText,
    defaultProps: {
      senderName: '{{sender_name}}',
      address: '{{footer_address}}',
      padding: '24px 20px 12px',
      backgroundColor: 'transparent',
    },
  },
  {
    type: 'unsubscribe',
    title: 'Unsubscribe Link',
    category: 'brand',
    description: 'Mandatory CAN-SPAM and GDPR one-click opt-out mechanism.',
    icon: ShieldAlert,
    defaultProps: {
      text: 'No longer want these updates? {{unsubscribe_url}}',
      padding: '12px 20px 24px',
    },
  },

  // --- MARKETING ---
  {
    type: 'hero',
    title: 'Hero Banner',
    category: 'marketing',
    description: 'High-conversion banner with headline, subtitle, and CTA.',
    icon: Sparkles,
    defaultProps: {
      title: 'Summer Flash Sale',
      subtitle: 'Enjoy up to 40% off handcrafted seasonal styles for a limited time.',
      backgroundColor: '#312E81',
      titleColor: '#FFFFFF',
      subtitleColor: '#C7D2FE',
      padding: '40px 24px',
      alignment: 'center',
    },
  },
  {
    type: 'coupon',
    title: 'Coupon Code',
    category: 'marketing',
    description: 'Dashed promo voucher with copyable discount code and terms.',
    icon: Ticket,
    defaultProps: {
      code: 'VIP25',
      discount: '25% OFF YOUR PURCHASE',
      description: 'Valid on orders over $60 through Sunday midnight.',
      backgroundColor: '#FEF3C7',
      borderColor: '#D97706',
    },
  },
  {
    type: 'discount_badge',
    title: 'Discount Badge',
    category: 'marketing',
    description: 'Pill announcement badge for urgency and promotions.',
    icon: BadgePercent,
    defaultProps: {
      text: '🔥 48 HOURS ONLY: 30% OFF EVERYTHING',
      backgroundColor: '#EF4444',
      textColor: '#FFFFFF',
    },
  },
  {
    type: 'product_card',
    title: 'Product Card',
    category: 'marketing',
    description: 'Featured product with image, title, price, and buy button.',
    icon: ShoppingBag,
    defaultProps: {
      title: 'Minimalist Leather Folio',
      price: '$89.00',
      strikePrice: '$120.00',
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
      buttonText: 'View Product',
      buttonUrl: 'https://example.com/product',
      padding: '16px 20px',
    },
  },
  {
    type: 'product_grid',
    title: 'Product Grid',
    category: 'marketing',
    description: 'Two-column product grid with mobile responsive stacking.',
    icon: LayoutGrid,
    defaultProps: {
      product1Title: 'Minimalist Desk Lamp',
      product1Price: '$64.00',
      product1Image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
      product1Url: 'https://example.com/lamp',
      product2Title: 'Ceramic Pour Over',
      product2Price: '$42.00',
      product2Image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
      product2Url: 'https://example.com/coffee',
    },
  },

  // --- ADVANCED ---
  {
    type: 'two_column',
    title: 'Two-Column Section',
    category: 'advanced',
    description: 'Side-by-side informational columns that stack cleanly on mobile.',
    icon: Columns,
    defaultProps: {
      col1Title: 'Curated Artisan Design',
      col1Text: 'Every detail engineered for performance and balance.',
      col1LinkText: 'Learn More',
      col1Url: 'https://example.com',
      col2Title: 'Sustainable Craft',
      col2Text: '100% recyclable, plastic-free packaging and carbon neutral delivery.',
      col2LinkText: 'Our Mission',
      col2Url: 'https://example.com/mission',
    },
  },
  {
    type: 'image_text',
    title: 'Image with Text',
    category: 'advanced',
    description: 'Editorial media layout combining image with paragraph copy.',
    icon: SplitSquareVertical,
    defaultProps: {
      heading: 'Precision Craftsmanship',
      text: 'Every component is carefully inspected by hand to maintain uncompromising aesthetic and tactile quality.',
      imageSrc: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      imagePosition: 'left',
      buttonText: 'Read Story',
      buttonUrl: 'https://example.com',
    },
  },
  {
    type: 'feature_section',
    title: 'Feature Section',
    category: 'advanced',
    description: 'Structured card list highlighting core value propositions.',
    icon: CheckCircle2,
    defaultProps: {
      title: 'Why Leading Designers Trust Us',
      features: [
        { icon: '✦', title: 'Precision Tolerances', description: 'Zero compromise on finish and durability.' },
        { icon: '🛡', title: '2-Year Warranty', description: 'Comprehensive coverage against defects.' },
        { icon: '⚡', title: 'Carbon Neutral Delivery', description: 'Tracked global express dispatch.' },
      ],
    },
  },
  {
    type: 'announcement_bar',
    title: 'Announcement Bar',
    category: 'advanced',
    description: 'Attention-grabbing top bar for flash discounts and shipping notices.',
    icon: Megaphone,
    defaultProps: {
      text: 'FREE EXPRESS SHIPPING ON ORDERS OVER $75',
      linkText: 'Shop Now',
      linkUrl: 'https://example.com/shipping',
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
    },
  },
];

interface BlockSidebarProps {
  onAddBlock: (blockType: EditorBlockType, defaultProps: Record<string, unknown>) => void;
}

export function BlockSidebar({ onAddBlock }: BlockSidebarProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'basic' | 'brand' | 'marketing' | 'advanced'
  >('all');

  const filteredBlocks = useMemo(() => {
    return AVAILABLE_BLOCKS.filter((b) => {
      const matchesCat =
        selectedCategory === 'all' || b.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden select-none">
      {/* Sidebar Header & Search */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Content Blocks
        </h2>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
          {(['all', 'basic', 'brand', 'marketing', 'advanced'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Block List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No blocks found matching &ldquo;{search}&rdquo;
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const Icon = block.icon;
            return (
              <div
                key={block.type + block.title}
                className="group relative flex items-start p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
                onClick={() => onAddBlock(block.type, block.defaultProps)}
              >
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 text-slate-700 group-hover:text-indigo-600 transition-colors mr-3 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      {block.title}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                      {block.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-normal">
                    {block.description}
                  </p>
                </div>

                {/* Accessible Add Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBlock(block.type, block.defaultProps);
                  }}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title={`Add ${block.title} to email`}
                  aria-label={`Add ${block.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Hint */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
        Click or drag any block into the canvas to insert.
      </div>
    </aside>
  );
}

