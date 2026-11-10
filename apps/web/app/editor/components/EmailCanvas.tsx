'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Sparkles } from 'lucide-react';
import { IEditorSchema, IEditorBlock } from '@mailcraft/shared-types';
import { SortableBlock } from './SortableBlock';
import { BlockRenderer } from './BlockRenderer';

interface EmailCanvasProps {
  schema: IEditorSchema;
  viewport: 'desktop' | 'mobile';
  selectedBlockId: string | null;
  brand: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerAddress?: string;
  };
  onSelectBlock: (id: string | null) => void;
  onReorderBlocks: (newBlocks: IEditorBlock[]) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onOpenAddModal?: () => void;
}

export function EmailCanvas({
  schema,
  viewport,
  selectedBlockId,
  brand,
  onSelectBlock,
  onReorderBlocks,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onOpenAddModal,
}: EmailCanvasProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const blocks = schema.blocks || [];
  const contentWidth = Number(schema.settings?.contentWidth) || 600;
  const canvasBg = schema.settings?.background || schema.settings?.backgroundColor || '#F8F9FA';
  const fontFamily =
    schema.settings?.fontFamily ||
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(blocks, oldIndex, newIndex);
        onReorderBlocks(reordered);
      }
    }
  };

  const activeDraggingBlock = activeDragId
    ? blocks.find((b) => b.id === activeDragId)
    : null;

  return (
    <div
      onClick={() => onSelectBlock(null)}
      className="flex-1 bg-slate-100/80 overflow-auto p-3 sm:p-6 lg:p-8 flex justify-center items-start min-h-[calc(100vh-116px)] lg:min-h-[calc(100vh-64px)]"
    >
      {/* Viewport Frame */}
      <div
        style={{
          width: '100%',
          maxWidth: viewport === 'mobile' ? '375px' : `${contentWidth}px`,
          fontFamily,
        }}
        className={`transition-all duration-300 mx-auto bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden ${
          viewport === 'mobile' ? 'ring-4 sm:ring-8 ring-slate-800 rounded-3xl' : ''
        }`}
      >
        {/* Mobile Top Notch Simulator */}
        {viewport === 'mobile' && (
          <div className="bg-slate-800 py-1.5 flex justify-center items-center">
            <div className="w-20 h-3.5 bg-black rounded-full" />
          </div>
        )}

        <div style={{ backgroundColor: canvasBg, minHeight: '400px' }}>
          {blocks.length === 0 ? (
            <div className="p-12 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Your canvas is empty
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Click any content block from the left sidebar to add it to your
                promotional email.
              </p>
              {onOpenAddModal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddModal();
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Block</span>
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y-0">
                  {blocks.map((block, idx) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      isFirst={idx === 0}
                      isLast={idx === blocks.length - 1}
                      brand={brand}
                      settings={schema.settings || {}}
                      onSelect={() => onSelectBlock(block.id)}
                      onMoveUp={() => onMoveUp(idx)}
                      onMoveDown={() => onMoveDown(idx)}
                      onDuplicate={() => onDuplicate(idx)}
                      onDelete={() => onDelete(idx)}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Drag Overlay for active dragged block */}
              <DragOverlay>
                {activeDraggingBlock ? (
                  <div className="bg-white shadow-2xl rounded-lg ring-2 ring-indigo-500 opacity-90 p-2">
                    <BlockRenderer
                      block={activeDraggingBlock}
                      brand={brand}
                      settings={schema.settings || {}}
                      isSelected={false}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

