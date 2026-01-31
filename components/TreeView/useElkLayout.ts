'use client';

import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';
}

// Default node dimensions - generous estimates to account for objectives and pills
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 180;

// ELK layout options optimized for taxonomy/org-chart hierarchies
const getLayoutOptions = (direction: string = 'DOWN') => ({
  // Use layered algorithm - designed for hierarchical graphs
  'elk.algorithm': 'layered',
  // Direction: parents above children
  'elk.direction': direction,

  // === SPACING ===
  // Horizontal spacing between sibling nodes
  'elk.spacing.nodeNode': '80',
  // Vertical spacing between layers (parent to child)
  'elk.layered.spacing.nodeNodeBetweenLayers': '150',
  // Base value for all spacing calculations
  'elk.layered.spacing.baseValue': '60',
  // Edge spacing
  'elk.spacing.edgeEdge': '30',
  'elk.spacing.edgeNode': '50',
  'elk.layered.spacing.edgeNodeBetweenLayers': '50',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '30',

  // === HIERARCHY ===
  // Ensure proper layering based on edge direction
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  // Minimize edge crossings
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  // Node placement for balanced layout
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  // Favor straight edges where possible
  'elk.layered.nodePlacement.favorStraightEdges': 'true',

  // === EDGE ROUTING ===
  // Orthogonal (right-angle) edge routing
  'elk.edgeRouting': 'ORTHOGONAL',

  // === ALIGNMENT ===
  // How to handle disconnected components
  'elk.separateConnectedComponents': 'true',
  'elk.spacing.componentComponent': '100',

  // === QUALITY ===
  // Higher thoroughness = better results (but slower)
  'elk.layered.thoroughness': '15',

  // === ORDERING ===
  // Respect the order nodes are passed in for siblings
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
});

/**
 * Converts ReactFlow nodes/edges to ELK graph format
 * Simplified: no ports, direct node-to-node edges
 */
function toElkGraph(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): ElkNode {
  const {
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    direction = 'DOWN'
  } = options;

  return {
    id: 'root',
    layoutOptions: getLayoutOptions(direction),
    children: nodes.map((node) => ({
      id: node.id,
      width: nodeWidth,
      height: nodeHeight,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })) as ElkExtendedEdge[],
  };
}

/**
 * Applies ELK layout results back to ReactFlow nodes
 */
function applyLayoutToNodes(
  nodes: Node[],
  layoutedGraph: ElkNode
): Node[] {
  const layoutMap = new Map<string, { x: number; y: number }>();

  layoutedGraph.children?.forEach((elkNode) => {
    if (elkNode.x !== undefined && elkNode.y !== undefined) {
      layoutMap.set(elkNode.id, { x: elkNode.x, y: elkNode.y });
    }
  });

  return nodes.map((node) => {
    const position = layoutMap.get(node.id);
    if (position) {
      return {
        ...node,
        position: {
          x: position.x,
          y: position.y,
        },
      };
    }
    return node;
  });
}

/**
 * Applies ELK edge routing to ReactFlow edges
 */
function applyLayoutToEdges(
  edges: Edge[],
  layoutedGraph: ElkNode
): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    style: {
      stroke: '#cbd5e1',
      strokeWidth: 2,
    },
    animated: false,
  }));
}

/**
 * Hook for ELK-based layout calculation
 * Returns async function since ELK layout is asynchronous
 */
export function useElkLayout() {
  const getLayoutedElements = useCallback(
    async (
      nodes: Node[],
      edges: Edge[],
      options: LayoutOptions = {}
    ): Promise<{ nodes: Node[]; edges: Edge[] }> => {
      if (nodes.length === 0) {
        return { nodes, edges };
      }

      try {
        // Convert to ELK graph format
        const elkGraph = toElkGraph(nodes, edges, options);

        // Debug: log the graph structure
        console.log('ELK Input:', JSON.stringify(elkGraph, null, 2));

        // Run ELK layout algorithm
        const layoutedGraph = await elk.layout(elkGraph);

        // Debug: log the result
        console.log('ELK Output:', JSON.stringify(layoutedGraph, null, 2));

        // Apply layout results to nodes and edges
        const layoutedNodes = applyLayoutToNodes(nodes, layoutedGraph);
        const layoutedEdges = applyLayoutToEdges(edges, layoutedGraph);

        return { nodes: layoutedNodes, edges: layoutedEdges };
      } catch (error) {
        console.error('ELK layout failed:', error);
        // Return original nodes/edges if layout fails
        return { nodes, edges };
      }
    },
    []
  );

  return { getLayoutedElements };
}
