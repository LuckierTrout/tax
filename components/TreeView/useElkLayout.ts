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

// Default node dimensions
const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 120;

// ELK layout options optimized for taxonomy/org-chart hierarchies
const getLayoutOptions = (direction: string = 'DOWN') => ({
  'elk.algorithm': 'layered',
  'elk.direction': direction,
  // Spacing between nodes at the same level
  'elk.spacing.nodeNode': '50',
  // Spacing between levels (ranks)
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  // Base spacing value
  'elk.layered.spacing.baseValue': '30',
  // Edge routing - ORTHOGONAL gives us right-angle connections
  'elk.edgeRouting': 'ORTHOGONAL',
  // Ensure edges connect at proper ports
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  // Center nodes under their children
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  // Spacing for edge-edge
  'elk.spacing.edgeEdge': '20',
  // Spacing for edge-node
  'elk.spacing.edgeNode': '30',
  // Port alignment
  'elk.portAlignment.default': 'CENTER',
  // Hierarchical port positioning
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
});

/**
 * Converts ReactFlow nodes/edges to ELK graph format
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
      // Define ports for edge connections
      ports: [
        {
          id: `${node.id}-source`,
          properties: {
            side: 'SOUTH', // Bottom of node
          },
        },
        {
          id: `${node.id}-target`,
          properties: {
            side: 'NORTH', // Top of node
          },
        },
      ],
      properties: {
        'portConstraints': 'FIXED_SIDE',
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [`${edge.source}-source`],
      targets: [`${edge.target}-target`],
    })) as ElkExtendedEdge[],
  };
}

/**
 * Applies ELK layout results back to ReactFlow nodes
 */
function applyLayoutToNodes(
  nodes: Node[],
  layoutedGraph: ElkNode,
  nodeWidth: number
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
 * ELK provides bend points for orthogonal routing
 */
function applyLayoutToEdges(
  edges: Edge[],
  layoutedGraph: ElkNode
): Edge[] {
  const edgeMap = new Map<string, ElkExtendedEdge>();

  layoutedGraph.edges?.forEach((elkEdge) => {
    edgeMap.set(elkEdge.id, elkEdge);
  });

  return edges.map((edge) => {
    const elkEdge = edgeMap.get(edge.id);

    // If ELK provides sections with bend points, we could use them
    // For now, we rely on ReactFlow's smoothstep with proper node positions
    return {
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: '#cbd5e1',
        strokeWidth: 2,
      },
      // Animated false for cleaner look
      animated: false,
    };
  });
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

      const {
        nodeWidth = DEFAULT_NODE_WIDTH,
        nodeHeight = DEFAULT_NODE_HEIGHT
      } = options;

      try {
        // Convert to ELK graph format
        const elkGraph = toElkGraph(nodes, edges, options);

        // Run ELK layout algorithm
        const layoutedGraph = await elk.layout(elkGraph);

        // Apply layout results to nodes and edges
        const layoutedNodes = applyLayoutToNodes(nodes, layoutedGraph, nodeWidth);
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

/**
 * Synchronous wrapper that returns a promise
 * Useful for initial render where we want to show loading state
 */
export function useElkLayoutSync() {
  const { getLayoutedElements } = useElkLayout();

  const getLayoutedElementsSync = useCallback(
    (
      nodes: Node[],
      edges: Edge[],
      options: LayoutOptions = {}
    ): { nodes: Node[]; edges: Edge[]; layoutPromise: Promise<{ nodes: Node[]; edges: Edge[] }> } => {
      // Return original positions immediately, with a promise for the layout
      const layoutPromise = getLayoutedElements(nodes, edges, options);
      return { nodes, edges, layoutPromise };
    },
    [getLayoutedElements]
  );

  return { getLayoutedElementsSync, getLayoutedElements };
}
