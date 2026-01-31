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

  // Objective adds height
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

// Bottom-up layout: position leaves first, then center parents over children
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

  // Group nodes by level, maintaining DFS order
  const nodesByLevel = new Map<number, string[]>();

  function collectByLevel(nodeId: string): void {
    const depth = nodeDepth.get(nodeId) ?? 0;
    if (!nodesByLevel.has(depth)) {
      nodesByLevel.set(depth, []);
    }
    nodesByLevel.get(depth)!.push(nodeId);

    const children = childrenMap.get(nodeId) || [];
    children.forEach(collectByLevel);
  }

  roots.forEach((root) => collectByLevel(root.id));

  // Position storage
  const positions = new Map<string, { x: number; y: number }>();

  // BOTTOM-UP: Start from the deepest level
  // Position all nodes at deepest level with even spacing
  const deepestNodes = nodesByLevel.get(maxDepth) || [];
  const totalWidth = deepestNodes.length * nodeWidth + (deepestNodes.length - 1) * nodeSep;
  let currentX = -totalWidth / 2 + nodeWidth / 2;

  deepestNodes.forEach((nodeId) => {
    const y = levelYPositions.get(maxDepth) ?? 0;
    positions.set(nodeId, { x: currentX, y });
    currentX += nodeWidth + nodeSep;
  });

  // Work up from bottom, positioning parents at center of their children
  for (let level = maxDepth - 1; level >= 0; level--) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const y = levelYPositions.get(level) ?? 0;

    nodesAtLevel.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];

      if (children.length > 0) {
        // Get children's X positions
        const childXPositions = children.map((childId) => {
          const pos = positions.get(childId);
          return pos ? pos.x : 0;
        });

        // Center parent over children
        const minChildX = Math.min(...childXPositions);
        const maxChildX = Math.max(...childXPositions);
        const centerX = (minChildX + maxChildX) / 2;

        positions.set(nodeId, { x: centerX, y });
      } else {
        // Leaf node at this level (shouldn't happen often, but handle it)
        // Find position based on order
        const existingPositions = Array.from(positions.values()).map(p => p.x);
        const maxX = existingPositions.length > 0 ? Math.max(...existingPositions) : 0;
        positions.set(nodeId, { x: maxX + nodeWidth + nodeSep, y });
      }
    });
  }

  // Now ensure siblings at each non-bottom level have even spacing
  // while keeping parents centered
  for (let level = maxDepth - 1; level >= 0; level--) {
    const nodesAtLevel = nodesByLevel.get(level) || [];

    // Group by parent to handle siblings
    const siblingGroups = new Map<string | null, string[]>();

    nodesAtLevel.forEach((nodeId) => {
      const parent = parentMap.get(nodeId) || null;
      if (!siblingGroups.has(parent)) {
        siblingGroups.set(parent, []);
      }
      siblingGroups.get(parent)!.push(nodeId);
    });

    // For each sibling group, ensure even spacing
    siblingGroups.forEach((siblings) => {
      if (siblings.length <= 1) return;

      // Sort by current X position
      siblings.sort((a, b) => {
        const posA = positions.get(a);
        const posB = positions.get(b);
        return (posA?.x || 0) - (posB?.x || 0);
      });

      // Calculate the center of current positions
      const currentPositions = siblings.map(id => positions.get(id)!.x);
      const currentCenter = (Math.min(...currentPositions) + Math.max(...currentPositions)) / 2;

      // Calculate even spacing
      const totalSiblingWidth = siblings.length * nodeWidth + (siblings.length - 1) * nodeSep;
      let newX = currentCenter - totalSiblingWidth / 2 + nodeWidth / 2;

      siblings.forEach((siblingId) => {
        const pos = positions.get(siblingId)!;
        const oldX = pos.x;
        const shift = newX - oldX;

        // Move this sibling
        positions.set(siblingId, { x: newX, y: pos.y });

        // Also shift all descendants by the same amount
        function shiftDescendants(nodeId: string, dx: number): void {
          const children = childrenMap.get(nodeId) || [];
          children.forEach((childId) => {
            const childPos = positions.get(childId);
            if (childPos) {
              positions.set(childId, { x: childPos.x + dx, y: childPos.y });
              shiftDescendants(childId, dx);
            }
          });
        }

        if (shift !== 0) {
          shiftDescendants(siblingId, shift);
        }

        newX += nodeWidth + nodeSep;
      });
    });
  }

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
