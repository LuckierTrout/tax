'use client';

import { TaxonomyNode, TaxonomyLevel } from '@/types/taxonomy';
import { LEVEL_COLORS, LEVEL_LABELS } from '@/config/levels';
import { Plus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ColumnProps {
  level: TaxonomyLevel;
  nodes: TaxonomyNode[];
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (nodeId: string) => void;
  onAdd: () => void;
  canAdd: boolean;
}

export function Column({
  level,
  nodes,
  selectedId,
  highlightedIds,
  onSelect,
  onAdd,
  canAdd,
}: ColumnProps) {
  const colors = LEVEL_COLORS[level];

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className={clsx('p-4 border-b border-gray-200 rounded-t-xl', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={clsx('w-3 h-3 rounded-full', colors.dot)} />
            <h3 className="font-semibold text-gray-900 text-sm">
              {LEVEL_LABELS[level]}
            </h3>
          </div>
          <span className="text-xs text-gray-500">{nodes.length}</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2">
        {nodes.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            No items
          </div>
        ) : (
          nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const isHighlighted = highlightedIds.has(node.id);

            return (
              <div
                key={node.id}
                onClick={() => onSelect(node.id)}
                className={clsx(
                  'flex items-center gap-2 p-3 rounded-lg mb-1 cursor-pointer group transition-colors',
                  isSelected
                    ? [colors.bg, colors.border, 'border-2']
                    : 'hover:bg-gray-100',
                  isHighlighted && !isSelected && 'bg-yellow-50 ring-1 ring-yellow-300'
                )}
              >
                <span
                  className={clsx(
                    'flex-1 text-sm truncate',
                    isSelected ? colors.text + ' font-medium' : 'text-gray-700'
                  )}
                >
                  {node.name}
                </span>
                {level !== 'subtopic' && (
                  <ChevronRight
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isSelected ? colors.text : 'text-gray-300 group-hover:text-gray-500'
                    )}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Button */}
      {canAdd && (
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={onAdd}
            className={clsx(
              'w-full px-3 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1 transition-colors',
              colors.text,
              colors.bg,
              'hover:opacity-80'
            )}
          >
            <Plus className="w-4 h-4" />
            Add {LEVEL_LABELS[level]}
          </button>
        </div>
      )}
    </div>
  );
}
