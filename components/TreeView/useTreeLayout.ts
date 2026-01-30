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

// Improved tree layout that aligns nodes by level (like an org chart)
function calculateTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  const {
    nodeWidth = 180,
    nodeHeight = 70,
    rankSep = 120,  // Vertical spacing between levels
    nodeSep = 40,   // Horizontal spacing between nodes
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

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  nodes.forEach((node) => {
    const depth = nodeDepth.get(node.id) ?? 0;
    if (!nodesByLevel.has(depth)) {
      nodesByLevel.set(depth, []);
    }
    nodesByLevel.get(depth)!.push(node.id);
  });

  // Calculate the width needed for each subtree
  const subtreeWidth = new Map<string, number>();

  function calcSubtreeWidth(nodeId: string): number {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWidth.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    const childrenTotalWidth = children.reduce((sum, childId) => {
      return sum + calcSubtreeWidth(childId);
    }, 0) + (children.length - 1) * nodeSep;

    const width = Math.max(nodeWidth, childrenTotalWidth);
    subtreeWidth.set(nodeId, width);
    return width;
  }

  roots.forEach((root) => calcSubtreeWidth(root.id));

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>();

  function positionSubtree(nodeId: string, centerX: number, y: number): void {
    // Position this node at the center
    positions.set(nodeId, { x: centerX, y });

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    // Calculate total width of all children
    const childWidths = children.map((id) => subtreeWidth.get(id) || nodeWidth);
    const totalChildrenWidth = childWidths.reduce((sum, w) => sum + w, 0) +
      (children.length - 1) * nodeSep;

    // Position children centered under this node
    let currentX = centerX - totalChildrenWidth / 2;

    children.forEach((childId, i) => {
      const childWidth = childWidths[i];
      const childCenterX = currentX + childWidth / 2;
      positionSubtree(childId, childCenterX, y + rankSep);
      currentX += childWidth + nodeSep;
    });
  }

  // Position all root trees
  const rootWidths = roots.map((r) => subtreeWidth.get(r.id) || nodeWidth);
  const totalWidth = rootWidths.reduce((sum, w) => sum + w, 0) +
    (roots.length - 1) * nodeSep * 2;

  let currentX = -totalWidth / 2;

  roots.forEach((root, i) => {
    const rootWidth = rootWidths[i];
    const centerX = currentX + rootWidth / 2;
    positionSubtree(root.id, centerX, 0);
    currentX += rootWidth + nodeSep * 2;
  });

  // IMPORTANT: Ensure all nodes at the same level have the same Y position
  // This creates the horizontal alignment you want
  const maxLevels = Math.max(...Array.from(nodeDepth.values())) + 1;

  for (let level = 0; level < maxLevels; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || [];
    const y = level * rankSep;

    nodesAtLevel.forEach((nodeId) => {
      const pos = positions.get(nodeId);
      if (pos) {
        positions.set(nodeId, { x: pos.x, y });
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
