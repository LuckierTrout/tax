import { TaxonomyNode, TreeNode } from '@/types/taxonomy';
import { Node, Edge } from '@xyflow/react';
import { LEVEL_COLORS } from '@/config/levels';

// Convert flat nodes to nested tree structure
export function buildTree(nodes: TaxonomyNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create TreeNode objects
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Second pass: build parent-child relationships
  nodes.forEach((node) => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  });

  // Sort children by order
  const sortChildren = (treeNodes: TreeNode[]) => {
    treeNodes.sort((a, b) => a.order - b.order);
    treeNodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

// Get all descendant IDs of a node
export function getDescendants(nodeId: string, nodes: TaxonomyNode[]): string[] {
  const children = nodes.filter((n) => n.parentId === nodeId);
  return children.flatMap((child) => [child.id, ...getDescendants(child.id, nodes)]);
}

// Filter nodes to only include those under a specific pillar
export function filterByPillar(
  nodes: TaxonomyNode[],
  pillarId: string | null
): TaxonomyNode[] {
  if (pillarId === null) return nodes;

  const pillar = nodes.find((n) => n.id === pillarId);
  if (!pillar) return [];

  const descendants = getDescendants(pillarId, nodes);
  return nodes.filter((n) => n.id === pillarId || descendants.includes(n.id));
}

// Convert taxonomy nodes to ReactFlow nodes and edges
export function toReactFlowElements(nodes: TaxonomyNode[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const flowNodes: Node[] = nodes.map((node) => ({
    id: node.id,
    type: 'taxonomyNode',
    position: { x: 0, y: 0 }, // Will be calculated by layout
    data: {
      label: node.name,
      level: node.level,
      description: node.description,
      objective: node.objective,
      audiences: node.audiences,
      geographies: node.geographies,
      colors: LEVEL_COLORS[node.level],
    },
  }));

  const flowEdges: Edge[] = nodes
    .filter((node) => node.parentId !== null)
    .map((node) => ({
      id: `${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: '#cbd5e1', strokeWidth: 2 },
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

// Search nodes by name
export function searchNodes(
  nodes: TaxonomyNode[],
  searchTerm: string
): TaxonomyNode[] {
  if (!searchTerm.trim()) return nodes;

  const term = searchTerm.toLowerCase();
  const matchingIds = new Set<string>();

  // Find nodes that match the search term
  nodes.forEach((node) => {
    if (node.name.toLowerCase().includes(term)) {
      matchingIds.add(node.id);

      // Include all ancestors
      let current = node;
      while (current.parentId) {
        matchingIds.add(current.parentId);
        const parent = nodes.find((n) => n.id === current.parentId);
        if (!parent) break;
        current = parent;
      }

      // Include all descendants
      getDescendants(node.id, nodes).forEach((id) => matchingIds.add(id));
    }
  });

  return nodes.filter((n) => matchingIds.has(n.id));
}

// Get nodes at a specific level
export function getNodesByLevel(
  nodes: TaxonomyNode[],
  level: TaxonomyNode['level']
): TaxonomyNode[] {
  return nodes.filter((n) => n.level === level).sort((a, b) => a.order - b.order);
}

// Get children of a specific node
export function getChildren(
  nodes: TaxonomyNode[],
  parentId: string | null
): TaxonomyNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

// Get the path from root to a node
export function getNodePath(
  nodes: TaxonomyNode[],
  nodeId: string
): TaxonomyNode[] {
  const path: TaxonomyNode[] = [];
  let current = nodes.find((n) => n.id === nodeId);

  while (current) {
    path.unshift(current);
    if (current.parentId === null) break;
    current = nodes.find((n) => n.id === current!.parentId);
  }

  return path;
}

// Count descendants at each level
export function countDescendantsByLevel(
  nodes: TaxonomyNode[],
  nodeId: string
): Record<string, number> {
  const descendants = getDescendants(nodeId, nodes);
  const descendantNodes = nodes.filter((n) => descendants.includes(n.id));

  return descendantNodes.reduce(
    (acc, node) => {
      acc[node.level] = (acc[node.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}
