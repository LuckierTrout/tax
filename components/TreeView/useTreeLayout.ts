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
const MIN_GAP_BETWEEN_TIERS = 150; // Minimum vertical gap between tiers
const HORIZONTAL_NODE_GAP = 60;   // Gap between sibling nodes

// Estimate node height based on content
function estimateNodeHeight(nodeData: Record<string, unknown>): number {
  let height = 0;

  // Base: level label + name + padding
  height += 70;

  // Objective adds height (only for pillar, narrative_theme, subject)
  const objective = nodeData.objective as string | undefined;
  if (objective) {
    const lines = Math.min(3, Math.ceil(objective.length / 30));
    height += 20 + (lines * 16);
  }

  // Audiences add height
  const audiences = nodeData.audiences as string[] | undefined;
  if (audiences && audiences.length > 0) {
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

// Calculate cumulative Y positions for each level
function calculateLevelYPositions(
  levelHeights: Map<number, number>,
  maxDepth: number,
  minGap: number
): Map<number, number> {
  const levelY = new Map<number, number>();
  let currentY = 0;

  for (let level = 0; level <= maxDepth; level++) {
    levelY.set(level, currentY);
    const levelHeight = levelHeights.get(level) || 100;
    currentY += levelHeight + minGap;
  }

  return levelY;
}

// Simple tree layout with even sibling spacing
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

  // Find root nodes
  const roots = nodes.filter((n) => !parentMap.has(n.id));

  // Calculate depth for each node
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

  // Calculate Y positions based on content heights
  const levelHeights = calculateLevelHeights(nodes, nodeDepth);
  const levelYPositions = calculateLevelYPositions(levelHeights, maxDepth, MIN_GAP_BETWEEN_TIERS);

  // Calculate subtree width for each node (bottom-up)
  const subtreeWidth = new Map<string, number>();

  function calcSubtreeWidth(nodeId: string): number {
    const children = childrenMap.get(nodeId) || [];

    if (children.length === 0) {
      // Leaf node - just its own width
      subtreeWidth.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    // Sum of children's subtree widths + gaps between them
    let totalWidth = 0;
    children.forEach((childId, index) => {
      totalWidth += calcSubtreeWidth(childId);
      if (index < children.length - 1) {
        totalWidth += nodeSep;
      }
    });

    subtreeWidth.set(nodeId, totalWidth);
    return totalWidth;
  }

  roots.forEach((root) => calcSubtreeWidth(root.id));

  // Position nodes (top-down)
  const positions = new Map<string, { x: number; y: number }>();

  function positionNode(nodeId: string, centerX: number): void {
    const depth = nodeDepth.get(nodeId) ?? 0;
    const y = levelYPositions.get(depth) ?? 0;

    positions.set(nodeId, { x: centerX, y });

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    // Calculate total width needed for children
    const childrenTotalWidth = subtreeWidth.get(nodeId) || nodeWidth;

    // Position children evenly, centered under this node
    let currentX = centerX - childrenTotalWidth / 2;

    children.forEach((childId) => {
      const childWidth = subtreeWidth.get(childId) || nodeWidth;
      const childCenterX = currentX + childWidth / 2;

      positionNode(childId, childCenterX);

      currentX += childWidth + nodeSep;
    });
  }

  // Position root nodes
  const totalRootWidth = roots.reduce((sum, root, index) => {
    const width = subtreeWidth.get(root.id) || nodeWidth;
    return sum + width + (index < roots.length - 1 ? nodeSep * 2 : 0);
  }, 0);

  let rootX = -totalRootWidth / 2;
  roots.forEach((root, index) => {
    const rootWidth = subtreeWidth.get(root.id) || nodeWidth;
    const rootCenterX = rootX + rootWidth / 2;

    positionNode(root.id, rootCenterX);

    rootX += rootWidth + (index < roots.length - 1 ? nodeSep * 2 : 0);
  });

  // Apply positions
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
