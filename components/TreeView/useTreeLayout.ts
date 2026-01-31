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

// Tree layout with even horizontal spacing at each level
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
  const nodeMap = new Map<string, Node>();

  nodes.forEach((node) => nodeMap.set(node.id, node));

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

  // Group nodes by level, maintaining tree order (DFS)
  const nodesByLevel = new Map<number, string[]>();

  // Use DFS to maintain left-to-right ordering based on tree structure
  function addNodesByLevel(nodeId: string): void {
    const depth = nodeDepth.get(nodeId) ?? 0;
    if (!nodesByLevel.has(depth)) {
      nodesByLevel.set(depth, []);
    }
    nodesByLevel.get(depth)!.push(nodeId);

    const children = childrenMap.get(nodeId) || [];
    children.forEach(addNodesByLevel);
  }

  roots.forEach((root) => addNodesByLevel(root.id));

  // Position storage
  const positions = new Map<string, { x: number; y: number }>();

  // Find the widest level to determine total canvas width
  let maxNodesAtLevel = 0;
  for (let level = 0; level <= maxDepth; level++) {
    const count = nodesByLevel.get(level)?.length || 0;
    if (count > maxNodesAtLevel) {
      maxNodesAtLevel = count;
    }
  }

  // Calculate total width based on widest level
  const totalWidth = maxNodesAtLevel * nodeWidth + (maxNodesAtLevel - 1) * nodeSep;

  // Position each level with even spacing
  for (let level = 0; level <= maxDepth; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const y = levelYPositions.get(level) ?? 0;
    const count = nodesAtLevel.length;

    if (count === 0) continue;

    if (count === 1) {
      // Single node - center it
      positions.set(nodesAtLevel[0], { x: 0, y });
    } else {
      // Multiple nodes - distribute evenly across the width
      // Calculate width needed for this level
      const levelWidth = count * nodeWidth + (count - 1) * nodeSep;

      // Use the larger of: this level's width or parent-constrained width
      const useWidth = Math.max(levelWidth, totalWidth * (count / maxNodesAtLevel));

      // Calculate spacing between node centers
      const spacing = useWidth / count;
      const startX = -useWidth / 2 + spacing / 2;

      nodesAtLevel.forEach((nodeId, index) => {
        const x = startX + index * spacing;
        positions.set(nodeId, { x, y });
      });
    }
  }

  // Second pass: adjust children to be centered under their parent
  // while maintaining even spacing among siblings
  for (let level = 1; level <= maxDepth; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];

    // Group nodes by parent
    const nodesByParent = new Map<string, string[]>();
    nodesAtLevel.forEach((nodeId) => {
      const parentId = parentMap.get(nodeId);
      if (parentId) {
        if (!nodesByParent.has(parentId)) {
          nodesByParent.set(parentId, []);
        }
        nodesByParent.get(parentId)!.push(nodeId);
      }
    });

    // For each parent, center its children under it with even spacing
    nodesByParent.forEach((children, parentId) => {
      const parentPos = positions.get(parentId);
      if (!parentPos || children.length === 0) return;

      const childCount = children.length;
      const childrenWidth = childCount * nodeWidth + (childCount - 1) * nodeSep;
      const startX = parentPos.x - childrenWidth / 2 + nodeWidth / 2;
      const y = levelYPositions.get(level) ?? 0;

      children.forEach((childId, index) => {
        const x = startX + index * (nodeWidth + nodeSep);
        positions.set(childId, { x, y });
      });
    });
  }

  // Third pass: resolve overlaps at each level
  for (let level = 0; level <= maxDepth; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    if (nodesAtLevel.length < 2) continue;

    // Sort by X position
    const sortedNodes = [...nodesAtLevel].sort((a, b) => {
      const posA = positions.get(a);
      const posB = positions.get(b);
      return (posA?.x || 0) - (posB?.x || 0);
    });

    // Check for overlaps and shift right as needed
    for (let i = 1; i < sortedNodes.length; i++) {
      const prevId = sortedNodes[i - 1];
      const currId = sortedNodes[i];
      const prevPos = positions.get(prevId)!;
      const currPos = positions.get(currId)!;

      const minX = prevPos.x + nodeWidth + nodeSep;
      if (currPos.x < minX) {
        currPos.x = minX;
        positions.set(currId, currPos);
      }
    }

    // Re-center the level after resolving overlaps
    const allX = sortedNodes.map((id) => positions.get(id)!.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const centerOffset = (minX + maxX) / 2;

    sortedNodes.forEach((nodeId) => {
      const pos = positions.get(nodeId)!;
      pos.x -= centerOffset;
      positions.set(nodeId, pos);
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
