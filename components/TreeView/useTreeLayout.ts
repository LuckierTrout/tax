'use client';

import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';

interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

// Base dimensions
const NODE_WIDTH = 220;
const MIN_GAP_BETWEEN_TIERS = 60; // Minimum vertical gap between tiers
const HORIZONTAL_NODE_GAP = 50;  // Gap between sibling nodes

// Estimate node height based on content
function estimateNodeHeight(nodeData: Record<string, unknown>): number {
  let height = 0;

  // Base: level label + name + padding
  height += 70;

  // Objective adds height (only for pillar, narrative_theme, subject)
  const objective = nodeData.objective as string | undefined;
  if (objective) {
    // Estimate ~20px per line, max 3 lines shown
    const lines = Math.min(3, Math.ceil(objective.length / 30));
    height += 20 + (lines * 16);
  }

  // Audiences add height
  const audiences = nodeData.audiences as string[] | undefined;
  if (audiences && audiences.length > 0) {
    // Pills wrap, estimate rows
    const pillsPerRow = 3;
    const rows = Math.ceil(audiences.length / pillsPerRow);
    height += 10 + (rows * 22);
  }

  // Geographies add height
  const geographies = nodeData.geographies as string[] | undefined;
  if (geographies && geographies.length > 0) {
    const pillsPerRow = 3;
    const rows = Math.ceil(geographies.length / pillsPerRow);
    height += 10 + (rows * 22);
  }

  return height;
}

// Calculate the maximum height of nodes at each level
function calculateLevelHeights(
  nodes: Node[],
  nodeDepth: Map<string, number>
): Map<number, number> {
  const levelHeights = new Map<number, number>();

  nodes.forEach((node) => {
    const depth = nodeDepth.get(node.id) ?? 0;
    const nodeHeight = estimateNodeHeight(node.data as Record<string, unknown>);

    const currentMax = levelHeights.get(depth) || 0;
    if (nodeHeight > currentMax) {
      levelHeights.set(depth, nodeHeight);
    }
  });

  return levelHeights;
}

// Calculate cumulative Y positions for each level based on actual heights
function calculateLevelYPositions(
  levelHeights: Map<number, number>,
  maxDepth: number,
  minGap: number
): Map<number, number> {
  const levelY = new Map<number, number>();
  let currentY = 0;

  for (let level = 0; level <= maxDepth; level++) {
    levelY.set(level, currentY);

    // Add the height of this level + gap for next level
    const levelHeight = levelHeights.get(level) || 100;
    currentY += levelHeight + minGap;
  }

  return levelY;
}

// Improved tree layout with content-aware vertical spacing
function calculateTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  const {
    nodeWidth = NODE_WIDTH,
    nodeSep = HORIZONTAL_NODE_GAP,
  } = options;

  if (nodes.length === 0) return nodes;

  // Build adjacency maps
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach((edge) => {
    parentMap.set(edge.target, edge.source);
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  // Find root nodes (nodes with no parent)
  const roots = nodes.filter((n) => !parentMap.has(n.id));

  // Calculate depth (level) for each node
  const nodeDepth = new Map<string, number>();

  function setDepth(nodeId: string, depth: number): void {
    nodeDepth.set(nodeId, depth);
    const children = childrenMap.get(nodeId) || [];
    children.forEach((childId) => setDepth(childId, depth + 1));
  }

  roots.forEach((root) => setDepth(root.id, 0));

  // Calculate max depth
  const maxDepth = nodes.length > 0
    ? Math.max(...Array.from(nodeDepth.values()))
    : 0;

  // Calculate height of tallest node at each level
  const levelHeights = calculateLevelHeights(nodes, nodeDepth);

  // Calculate Y position for each level based on cumulative heights
  const levelYPositions = calculateLevelYPositions(levelHeights, maxDepth, MIN_GAP_BETWEEN_TIERS);

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  nodes.forEach((node) => {
    const depth = nodeDepth.get(node.id) ?? 0;
    if (!nodesByLevel.has(depth)) {
      nodesByLevel.set(depth, []);
    }
    nodesByLevel.get(depth)!.push(node.id);
  });

  // BOTTOM-UP LAYOUT: Start with leaves, work up to roots
  const positions = new Map<string, { x: number; y: number }>();

  // Collect all leaf nodes in left-to-right order (DFS traversal)
  const leafNodes: string[] = [];
  function collectLeaves(nodeId: string): void {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      leafNodes.push(nodeId);
    } else {
      children.forEach(collectLeaves);
    }
  }
  roots.forEach((root) => collectLeaves(root.id));

  // Position leaf nodes evenly spaced
  const totalLeafWidth = leafNodes.length * nodeWidth + (leafNodes.length - 1) * nodeSep;
  let leafX = -totalLeafWidth / 2 + nodeWidth / 2;

  leafNodes.forEach((leafId) => {
    const depth = nodeDepth.get(leafId) ?? 0;
    const y = levelYPositions.get(depth) ?? 0;
    positions.set(leafId, { x: leafX, y });
    leafX += nodeWidth + nodeSep;
  });

  // Work bottom-up: position each parent at the center of its children
  const maxLevels = Math.max(...Array.from(nodeDepth.values())) + 1;

  for (let level = maxLevels - 2; level >= 0; level--) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const y = levelYPositions.get(level) ?? 0;

    nodesAtLevel.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];

      if (children.length > 0) {
        // Position parent at center of its children's X positions
        const childXPositions = children.map((childId) => {
          const pos = positions.get(childId);
          return pos ? pos.x : 0;
        });
        const centerX = (Math.min(...childXPositions) + Math.max(...childXPositions)) / 2;
        positions.set(nodeId, { x: centerX, y });
      } else {
        // Leaf node already positioned, just update Y if needed
        const pos = positions.get(nodeId);
        if (pos) {
          positions.set(nodeId, { x: pos.x, y });
        }
      }
    });
  }

  // Apply positions to nodes (adjusting for node width)
  return nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y,
      },
    };
  });
}

export function useTreeLayout() {
  const getLayoutedElements = useCallback(
    (
      nodes: Node[],
      edges: Edge[],
      options: LayoutOptions = {}
    ): { nodes: Node[]; edges: Edge[] } => {
      const layoutedNodes = calculateTreeLayout(nodes, edges, options);
      return { nodes: layoutedNodes, edges };
    },
    []
  );

  return { getLayoutedElements };
}
