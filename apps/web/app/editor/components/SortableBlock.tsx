'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
} from 'lucide-react';
import { IEditorBlock, IEditorSettings } from '@mailcraft/shared-types';
import { BlockRenderer } from './BlockRenderer';

interface SortableBlockProps {
  block: IEditorBlock;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  brand: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  };
  settings: IEditorSettings;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SortableBlock({
  block,
  isSelected,
  isFirst,
  isLast,
  brand,
  settings,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
  };

  const isMandatory = block.type === 'unsubscribe';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-indigo-500 z-10 shadow-xs'
          : 'hover:ring-1 hover:ring-indigo-300'
      }`}
    >
      {/* Floating Action Toolbar on Selected Block */}
      {isSelected && (
        <div className="absolute -top-8 right-2 flex items-center bg-indigo-900 text-white rounded-md shadow-md py-0.5 px-1 space-x-1 z-30 text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[9px] px-1 text-indigo-200">
            {block.type.replace('_', ' ')}
          </span>

          <div className="h-3 w-px bg-indigo-700" />

          {/* Move Up */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isFirst) onMoveUp();
            }}
            disabled={isFirst}
            className={`p-1 rounded hover:bg-indigo-800 transition-colors ${
              isFirst ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Move block up"
            aria-label="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isLast) onMoveDown();
            }}
            disabled={isLast}
            className={`p-1 rounded hover:bg-indigo-800 transition-colors ${
              isLast ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Move block down"
            aria-label="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded hover:bg-indigo-800 transition-colors"
            title="Duplicate block"
            aria-label="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isMandatory) onDelete();
            }}
            disabled={isMandatory}
            className={`p-1 rounded hover:bg-rose-600 transition-colors ${
              isMandatory ? 'opacity-30 cursor-not-allowed' : 'text-rose-300 hover:text-white'
            }`}
            title={isMandatory ? 'Unsubscribe link is required by anti-spam laws' : 'Delete block'}
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag Handle (Hover & Drag) */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-indigo-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded shadow-xs z-20"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Block Content */}
      <BlockRenderer
        block={block}
        brand={brand}
        settings={settings}
        isSelected={isSelected}
      />
    </div>
  );
}

