'use client';

import { useMemo } from 'react';
import { TaxonomyNode, TaxonomyLevel } from '@/types/taxonomy';
import { LEVEL_ORDER, getChildLevel } from '@/config/levels';
import { getChildren, getNodePath } from '@/lib/tree-utils';
import { Column } from './Column';

interface ColumnViewProps {
  taxonomyNodes: TaxonomyNode[];
  selectedNodeId: string | null;
  searchTerm: string;
  onNodeSelect: (nodeId: string | null) => void;
  onAddNode: (parentId: string | null, level: TaxonomyLevel) => void;
}

export function ColumnView({
  taxonomyNodes,
  selectedNodeId,
  searchTerm,
  onNodeSelect,
  onAddNode,
}: ColumnViewProps) {
  // Get highlighted node IDs based on search
  const highlightedIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();

    const term = searchTerm.toLowerCase();
    return new Set(
      taxonomyNodes
        .filter((n) => n.name.toLowerCase().includes(term))
        .map((n) => n.id)
    );
  }, [taxonomyNodes, searchTerm]);

  // Get the selection path (from pillar to selected node)
  const selectionPath = useMemo(() => {
    if (!selectedNodeId) return [];
    return getNodePath(taxonomyNodes, selectedNodeId);
  }, [taxonomyNodes, selectedNodeId]);

  // Get selected ID at each level based on selection path
  const selectedByLevel = useMemo(() => {
    const map: Record<TaxonomyLevel, string | null> = {
      pillar: null,
      narrative_theme: null,
      subject: null,
      topic: null,
      subtopic: null,
    };

    selectionPath.forEach((node) => {
      map[node.level] = node.id;
    });

    return map;
  }, [selectionPath]);

  // Get nodes to display in each column
  const columnData = useMemo(() => {
    const data: Array<{
      level: TaxonomyLevel;
      nodes: TaxonomyNode[];
      selectedId: string | null;
      parentIdForAdd: string | null;
      canAdd: boolean;
    }> = [];

    // Always show pillars
    data.push({
      level: 'pillar',
      nodes: getChildren(taxonomyNodes, null),
      selectedId: selectedByLevel.pillar,
      parentIdForAdd: null,
      canAdd: true,
    });

    // Show subsequent levels based on selection
    let currentParentId: string | null = selectedByLevel.pillar;

    for (let i = 1; i < LEVEL_ORDER.length; i++) {
      const level = LEVEL_ORDER[i];
      const parentLevel = LEVEL_ORDER[i - 1];
      const parentSelectedId = selectedByLevel[parentLevel];

      // Only show this column if parent is selected
      if (!parentSelectedId) break;

      const nodes = getChildren(taxonomyNodes, parentSelectedId);

      data.push({
        level,
        nodes,
        selectedId: selectedByLevel[level],
        parentIdForAdd: parentSelectedId,
        canAdd: true,
      });

      currentParentId = selectedByLevel[level];
    }

    return data;
  }, [taxonomyNodes, selectedByLevel]);

  return (
    <div className="flex gap-4 p-6 overflow-x-auto h-full">
      {columnData.map(({ level, nodes, selectedId, parentIdForAdd, canAdd }) => (
        <Column
          key={level}
          level={level}
          nodes={nodes}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={(nodeId) => onNodeSelect(nodeId)}
          onAdd={() => onAddNode(parentIdForAdd, level)}
          canAdd={canAdd}
        />
      ))}

      {/* Show empty placeholder columns for remaining levels */}
      {columnData.length < LEVEL_ORDER.length && selectedNodeId && (
        <div className="flex-shrink-0 w-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm text-center px-4">
            Select an item to see children
          </p>
        </div>
      )}
    </div>
  );
}
