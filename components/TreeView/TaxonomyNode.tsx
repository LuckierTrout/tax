'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaxonomyLevel, LEVELS_WITH_OBJECTIVE, LevelColorConfig, PillColorConfig } from '@/types/taxonomy';
import { LEVEL_LABELS, getDefaultAudienceColor, getDefaultGeographyColor } from '@/config/levels';
import { Plus } from 'lucide-react';
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
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  nodeId?: string;
  customColors?: LevelColorConfig;
  audienceColors?: Record<string, PillColorConfig>;
  geographyColors?: Record<string, PillColorConfig>;
}

function TaxonomyNodeComponent({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as TaxonomyNodeData;
  const customColors = nodeData.customColors;
  const isSelected = nodeData.isSelected || selected;
  const showObjective = LEVELS_WITH_OBJECTIVE.includes(nodeData.level) && nodeData.objective;
  const hasAudiences = nodeData.audiences && nodeData.audiences.length > 0;
  const hasGeographies = nodeData.geographies && nodeData.geographies.length > 0;
  const showPills = hasAudiences || hasGeographies;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeData.onContextMenu) {
      nodeData.onContextMenu(e, id);
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeData.onAddChild) {
      nodeData.onAddChild(id);
    }
  };

  const canHaveChildren = nodeData.level !== 'subtopic';

  // Use custom colors with inline styles
  const nodeStyle = customColors ? {
    backgroundColor: customColors.bg,
    borderColor: customColors.border,
  } : {};

  // Get audience pill color
  const getAudiencePillColor = (audience: string, index: number): PillColorConfig => {
    if (nodeData.audienceColors?.[audience]) {
      return nodeData.audienceColors[audience];
    }
    return getDefaultAudienceColor(index);
  };

  // Get geography pill color
  const getGeographyPillColor = (geography: string, index: number): PillColorConfig => {
    if (nodeData.geographyColors?.[geography]) {
      return nodeData.geographyColors[geography];
    }
    return getDefaultGeographyColor(index);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className={clsx(
        'group px-4 py-3 rounded-lg border-2 shadow-sm min-w-[140px] max-w-[220px] cursor-pointer transition-all relative',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        nodeData.isHighlighted && 'ring-2 ring-yellow-400'
      )}
      style={nodeStyle}
      data-level={nodeData.level}
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
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={customColors ? { backgroundColor: customColors.dot } : {}}
        />
        <span
          className="font-semibold text-sm text-center"
          style={customColors ? { color: customColors.dot } : {}}
        >
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
              {nodeData.audiences!.map((audience, index) => {
                const colors = getAudiencePillColor(audience, index);
                return (
                  <span
                    key={audience}
                    className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {audience}
                  </span>
                );
              })}
            </div>
          )}
          {/* Separator line between audiences and geographies */}
          {hasAudiences && hasGeographies && (
            <div className="border-t border-gray-100 my-1" />
          )}
          {/* Geographies */}
          {hasGeographies && (
            <div className="flex flex-wrap gap-1">
              {nodeData.geographies!.map((geography, index) => {
                const colors = getGeographyPillColor(geography, index);
                return (
                  <span
                    key={geography}
                    className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {geography}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {canHaveChildren && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-gray-400 !w-2 !h-2"
          />
          {/* Add child button - appears on hover */}
          <button
            onClick={handleAddChild}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:border-blue-500 hover:bg-blue-50 hover:scale-110 z-10"
            title="Add child node"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500 hover:text-blue-600" />
          </button>
        </>
      )}
    </div>
  );
}

export const TaxonomyNode = memo(TaxonomyNodeComponent);
