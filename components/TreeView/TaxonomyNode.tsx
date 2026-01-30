'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaxonomyLevel, LEVELS_WITH_OBJECTIVE } from '@/types/taxonomy';
import { LEVEL_COLORS, LEVEL_LABELS } from '@/config/levels';
import clsx from 'clsx';

interface TaxonomyNodeData {
  label: string;
  level: TaxonomyLevel;
  description?: string;
  objective?: string;
  audiences?: string[];
  geographies?: string[];
  isSelected?: boolean;
  isHighlighted?: boolean;
}

function TaxonomyNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TaxonomyNodeData;
  const colors = LEVEL_COLORS[nodeData.level];
  const isSelected = nodeData.isSelected || selected;
  const showObjective = LEVELS_WITH_OBJECTIVE.includes(nodeData.level) && nodeData.objective;
  const hasAudiences = nodeData.audiences && nodeData.audiences.length > 0;
  const hasGeographies = nodeData.geographies && nodeData.geographies.length > 0;
  const showPills = hasAudiences || hasGeographies;

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[140px] max-w-[220px] cursor-pointer transition-all',
        colors.border,
        colors.bg,
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        nodeData.isHighlighted && 'ring-2 ring-yellow-400'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />

      {/* Level label at top, smaller and centered */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider text-center mb-1">
        {LEVEL_LABELS[nodeData.level]}
      </div>

      {/* Node name with colored dot, centered */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
        <span className={clsx('font-semibold text-sm text-center', colors.text)}>
          {nodeData.label}
        </span>
      </div>

      {/* Objective - left aligned, smaller text */}
      {showObjective && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-[10px] text-gray-500 line-clamp-3 text-left whitespace-pre-wrap">
            {nodeData.objective}
          </p>
        </div>
      )}

      {/* Audiences and Geographies pills */}
      {showPills && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          {/* Audiences */}
          {hasAudiences && (
            <div className="flex flex-wrap gap-1">
              {nodeData.audiences!.map((audience) => (
                <span
                  key={audience}
                  className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-medium"
                >
                  {audience}
                </span>
              ))}
            </div>
          )}
          {/* Separator line between audiences and geographies */}
          {hasAudiences && hasGeographies && (
            <div className="border-t border-gray-100 my-1" />
          )}
          {/* Geographies */}
          {hasGeographies && (
            <div className="flex flex-wrap gap-1">
              {nodeData.geographies!.map((geography) => (
                <span
                  key={geography}
                  className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-medium"
                >
                  {geography}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {nodeData.level !== 'subtopic' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gray-400 !w-2 !h-2"
        />
      )}
    </div>
  );
}

export const TaxonomyNode = memo(TaxonomyNodeComponent);
