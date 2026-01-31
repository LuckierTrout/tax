'use client';

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TaxonomyNode as TaxonomyNodeComponent } from './TaxonomyNode';
import { useTreeLayout } from './useTreeLayout';
import { TaxonomyNode, TaxonomyLevel, LevelColorConfig, PillColorConfig } from '@/types/taxonomy';
import { toReactFlowElements } from '@/lib/tree-utils';
import { DEFAULT_LEVEL_COLORS_HEX } from '@/config/levels';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import {
  exportReactFlowToPDF,
  exportReactFlowToSVG,
  exportReactFlowToJPG,
  exportReactFlowToPNG,
  ImageExportFormat,
} from '@/lib/pdf-export';

interface TreeViewProps {
  taxonomyNodes: TaxonomyNode[];
  selectedNodeId: string | null;
  searchTerm: string;
  onNodeSelect: (nodeId: string | null) => void;
  selectedPillar: string | null;
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
  onAddChild?: (nodeId: string) => void;
  levelColors?: Record<TaxonomyLevel, LevelColorConfig>;
  audienceColors?: Record<string, PillColorConfig>;
  geographyColors?: Record<string, PillColorConfig>;
}

export interface TreeViewExportFunctions {
  exportPDF: () => Promise<void>;
  exportSVG: () => Promise<void>;
  exportJPG: () => Promise<void>;
  exportPNG: () => Promise<void>;
}

const nodeTypes: NodeTypes = {
  taxonomyNode: TaxonomyNodeComponent,
};

interface TreeViewInnerProps extends TreeViewProps {
  onExportReady?: (exportFns: TreeViewExportFunctions) => void;
}

function TreeViewInner({
  taxonomyNodes,
  selectedNodeId,
  searchTerm,
  onNodeSelect,
  selectedPillar,
  onContextMenu,
  onAddChild,
  levelColors,
  audienceColors,
  geographyColors,
  onExportReady,
}: TreeViewInnerProps) {
  const { getLayoutedElements } = useTreeLayout();
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the taxonomy data version to know when to re-layout
  const taxonomyVersion = useMemo(() => {
    return JSON.stringify(taxonomyNodes.map(n => ({ id: n.id, parentId: n.parentId, name: n.name, objective: n.objective })));
  }, [taxonomyNodes]);

  // Create base elements from taxonomy data (only recalculates when taxonomy changes)
  const baseElements = useMemo(() => {
    const { nodes, edges } = toReactFlowElements(taxonomyNodes);
    return getLayoutedElements(nodes, edges);
  }, [taxonomyVersion, getLayoutedElements]);

  const [nodes, setNodesState, onNodesChange] = useNodesState(baseElements.nodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(baseElements.edges);

  // Reset layout when taxonomy data actually changes (structure changes)
  const prevVersionRef = useRef(taxonomyVersion);
  useEffect(() => {
    if (prevVersionRef.current !== taxonomyVersion) {
      prevVersionRef.current = taxonomyVersion;
      setNodesState(baseElements.nodes);
      setEdgesState(baseElements.edges);
    }
  }, [taxonomyVersion, baseElements, setNodesState, setEdgesState]);

  // Update node data (selection/highlight state) without changing positions
  useEffect(() => {
    setNodesState((currentNodes) =>
      currentNodes.map((node) => {
        const nodeLevel = node.data?.level as TaxonomyLevel;
        const customColors = levelColors?.[nodeLevel] || DEFAULT_LEVEL_COLORS_HEX[nodeLevel];
        return {
          ...node,
          data: {
            ...node.data,
            isSelected: node.id === selectedNodeId,
            isHighlighted:
              searchTerm &&
              taxonomyNodes
                .find((n) => n.id === node.id)
                ?.name.toLowerCase()
                .includes(searchTerm.toLowerCase()),
            onContextMenu,
            onAddChild,
            nodeId: node.id,
            customColors,
            audienceColors,
            geographyColors,
          },
        };
      })
    );
  }, [selectedNodeId, searchTerm, taxonomyNodes, setNodesState, onContextMenu, onAddChild, levelColors, audienceColors, geographyColors]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Auto-organize: re-run layout and fit to view
  const handleAutoOrganize = useCallback(() => {
    // Get fresh elements from current taxonomy data
    const { nodes: freshNodes, edges: freshEdges } = toReactFlowElements(taxonomyNodes);

    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      freshNodes,
      freshEdges
    );

    // Preserve selection state and context menu handler
    const nodesWithState = layoutedNodes.map((node) => {
      const nodeLevel = node.data?.level as TaxonomyLevel;
      const customColors = levelColors?.[nodeLevel] || DEFAULT_LEVEL_COLORS_HEX[nodeLevel];
      return {
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedNodeId,
          isHighlighted:
            searchTerm &&
            taxonomyNodes
              .find((n) => n.id === node.id)
              ?.name.toLowerCase()
              .includes(searchTerm.toLowerCase()),
          onContextMenu,
          onAddChild,
          nodeId: node.id,
          customColors,
          audienceColors,
          geographyColors,
        },
      };
    });

    setNodesState(nodesWithState);
    setEdgesState(layoutedEdges);

    // Wait for layout to apply, then fit view
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [taxonomyNodes, getLayoutedElements, selectedNodeId, searchTerm, setNodesState, setEdgesState, fitView, onContextMenu, onAddChild, levelColors, audienceColors, geographyColors]);

  // Fit to screen only (no re-layout)
  const handleFitToScreen = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Prepare for export (auto-organize and fit view)
  const prepareForExport = useCallback(async () => {
    if (!containerRef.current) throw new Error('Container not ready');

    // First auto-organize
    const { nodes: freshNodes, edges: freshEdges } = toReactFlowElements(taxonomyNodes);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      freshNodes,
      freshEdges
    );

    setNodesState(layoutedNodes);
    setEdgesState(layoutedEdges);

    // Wait for layout to apply
    await new Promise(resolve => setTimeout(resolve, 200));

    // Fit view to ensure all nodes are visible
    fitView({ padding: 0.3, duration: 0 });

    // Wait for fit view to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate filename based on what's being exported
    const pillarNode = selectedPillar
      ? taxonomyNodes.find(n => n.id === selectedPillar)
      : null;
    const filename = pillarNode
      ? `taxonomy-${pillarNode.name.toLowerCase().replace(/\s+/g, '-')}`
      : 'taxonomy-full';

    return { container: containerRef.current, filename };
  }, [taxonomyNodes, getLayoutedElements, setNodesState, setEdgesState, fitView, selectedPillar]);

  // Export handlers
  const handleExportPDF = useCallback(async () => {
    try {
      const { container, filename } = await prepareForExport();
      await exportReactFlowToPDF(container, { filename, scale: 2, backgroundColor: '#f8fafc' });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [prepareForExport]);

  const handleExportSVG = useCallback(async () => {
    try {
      const { container, filename } = await prepareForExport();
      await exportReactFlowToSVG(container, { filename, backgroundColor: '#f8fafc' });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export SVG. Please try again.');
    }
  }, [prepareForExport]);

  const handleExportJPG = useCallback(async () => {
    try {
      const { container, filename } = await prepareForExport();
      await exportReactFlowToJPG(container, { filename, scale: 2, backgroundColor: '#f8fafc' });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export JPG. Please try again.');
    }
  }, [prepareForExport]);

  const handleExportPNG = useCallback(async () => {
    try {
      const { container, filename } = await prepareForExport();
      await exportReactFlowToPNG(container, { filename, scale: 2, backgroundColor: '#f8fafc' });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PNG. Please try again.');
    }
  }, [prepareForExport]);

  // Expose export functions to parent
  useEffect(() => {
    if (onExportReady) {
      onExportReady({
        exportPDF: handleExportPDF,
        exportSVG: handleExportSVG,
        exportJPG: handleExportJPG,
        exportPNG: handleExportPNG,
      });
    }
  }, [handleExportPDF, handleExportSVG, handleExportJPG, handleExportPNG, onExportReady]);

  // Custom minimap node color based on level
  const nodeColor = useCallback((node: Node) => {
    const level = node.data?.level as TaxonomyLevel;
    if (level) {
      // Use custom colors if available, otherwise use defaults
      const customColors = levelColors?.[level] || DEFAULT_LEVEL_COLORS_HEX[level];
      return customColors.dot;
    }
    return '#cbd5e1';
  }, [levelColors]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
          pannable
          zoomable
        />

        {/* Top right panel with organize buttons */}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleAutoOrganize}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Re-organize and center the tree"
            >
              <LayoutGrid className="w-4 h-4" />
              Auto-Organize
            </button>
            <button
              onClick={handleFitToScreen}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Fit tree to screen"
            >
              <Maximize2 className="w-4 h-4" />
              Fit to Screen
            </button>
          </div>
          <div className="bg-white/80 rounded-lg px-2 py-1 text-xs text-gray-500 text-right">
            Scroll to zoom • Drag to pan • Click node to select
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrap with ReactFlowProvider to access useReactFlow hook
interface TreeViewWithRefProps extends TreeViewProps {
  onExportReady?: (exportFns: TreeViewExportFunctions) => void;
}

export function TreeView({ onExportReady, ...props }: TreeViewWithRefProps) {
  return (
    <ReactFlowProvider>
      <TreeViewInner {...props} onExportReady={onExportReady} />
    </ReactFlowProvider>
  );
}
