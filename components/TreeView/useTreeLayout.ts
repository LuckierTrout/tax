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

// Dynamic spacing constants
const BASE_NODE_SEP = 60;  // Max horizontal spacing (small/sparse trees)
const MIN_NODE_SEP = 40;   // Min horizontal spacing (large/dense trees) - ensures readable gaps
const BASE_RANK_SEP = 200; // Max vertical spacing (shallow trees)
const MIN_RANK_SEP = 170;  // Min vertical spacing (deep trees) - ensures readable gaps

// Calculate dynamic spacing based on tree characteristics
function calculateDynamicSpacing(
  nodeCount: number,
  maxDepth: number,
  maxWidth: number
): { nodeSep: number; rankSep: number } {
  // Vertical scaling based on depth (1-5 levels)
  // At depth 5, rankSep compresses to minimum
  const depthScale = Math.max(0, Math.min(1, (5 - maxDepth) / 4));

  // Horizontal scaling based on max siblings at any level
  // At width 15+, nodeSep compresses to minimum
  const widthScale = Math.max(0, Math.min(1, (15 - maxWidth) / 14));

  // Overall density scaling based on total node count
  // At 100+ nodes, both compress to minimum
  const countScale = Math.max(0, Math.min(1, (100 - nodeCount) / 80));

  // Combine factors - use the more restrictive scale for each axis
  const nodeSep = MIN_NODE_SEP + (BASE_NODE_SEP - MIN_NODE_SEP) * Math.min(widthScale, countScale);
  const rankSep = MIN_RANK_SEP + (BASE_RANK_SEP - MIN_RANK_SEP) * Math.min(depthScale, countScale);

  return {
    nodeSep: Math.round(nodeSep),
    rankSep: Math.round(rankSep)
  };
}

// Improved tree layout that aligns nodes by level (like an org chart)
function calculateTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  const {
    nodeWidth = 180,
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

  // Calculate tree characteristics for dynamic spacing
  const maxDepth = nodes.length > 0
    ? Math.max(...Array.from(nodeDepth.values())) + 1
    : 1;
  const maxWidth = childrenMap.size > 0
    ? Math.max(...Array.from(childrenMap.values()).map(c => c.length), 1)
    : 1;

  // Get dynamic spacing based on tree size and shape
  const { nodeSep, rankSep } = options.nodeSep !== undefined && options.rankSep !== undefined
    ? { nodeSep: options.nodeSep, rankSep: options.rankSep }  // Use provided values if explicit
    : calculateDynamicSpacing(nodes.length, maxDepth, maxWidth);

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
    positions.set(leafId, { x: leafX, y: depth * rankSep });
    leafX += nodeWidth + nodeSep;
  });

  // Work bottom-up: position each parent at the center of its children
  const maxLevels = Math.max(...Array.from(nodeDepth.values())) + 1;

  for (let level = maxLevels - 2; level >= 0; level--) {
    const nodesAtLevel = nodesByLevel.get(level) || [];

    nodesAtLevel.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];

      if (children.length > 0) {
        // Position parent at center of its children's X positions
        const childXPositions = children.map((childId) => {
          const pos = positions.get(childId);
          return pos ? pos.x : 0;
        });
        const centerX = (Math.min(...childXPositions) + Math.max(...childXPositions)) / 2;
        positions.set(nodeId, { x: centerX, y: level * rankSep });
      } else {
        // Leaf node already positioned
        const pos = positions.get(nodeId);
        if (pos) {
          positions.set(nodeId, { x: pos.x, y: level * rankSep });
        }
      }
    });
  }

  // Apply positions to nodes (adjusting for node width/height)
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
