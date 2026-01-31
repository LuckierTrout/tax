'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useElkLayout } from './useElkLayout';
import { TaxonomyNode, TaxonomyLevel, LevelColorConfig, PillColorConfig } from '@/types/taxonomy';
import { toReactFlowElements } from '@/lib/tree-utils';
import { DEFAULT_LEVEL_COLORS_HEX } from '@/config/levels';
import { LayoutGrid, Maximize2, FileDown, Loader2 } from 'lucide-react';
import { exportReactFlowToPDF } from '@/lib/pdf-export';

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

const nodeTypes: NodeTypes = {
  taxonomyNode: TaxonomyNodeComponent,
};

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
}: TreeViewProps) {
  const { getLayoutedElements } = useElkLayout();
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);

  // Initialize with empty state - will be populated after layout
  const [nodes, setNodesState, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState<Edge>([]);

  // Track the taxonomy data version to know when to re-layout
  const prevVersionRef = useRef<string>('');

  // Helper to enrich nodes with UI state (selection, colors, handlers)
  const enrichNodesWithState = useCallback(
    (layoutedNodes: Node[]): Node[] => {
      return layoutedNodes.map((node) => {
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
    },
    [selectedNodeId, searchTerm, taxonomyNodes, onContextMenu, onAddChild, levelColors, audienceColors, geographyColors]
  );

  // Run ELK layout when taxonomy data changes
  useEffect(() => {
    const taxonomyVersion = JSON.stringify(
      taxonomyNodes.map((n) => ({ id: n.id, parentId: n.parentId, name: n.name, objective: n.objective }))
    );

    // Only re-layout if structure changed
    if (prevVersionRef.current === taxonomyVersion) {
      // Just update node state without re-layout
      setNodesState((currentNodes) => enrichNodesWithState(currentNodes));
      return;
    }

    prevVersionRef.current = taxonomyVersion;
    setIsLayouting(true);

    const runLayout = async () => {
      try {
        const { nodes: rawNodes, edges: rawEdges } = toReactFlowElements(taxonomyNodes);
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
          rawNodes,
          rawEdges
        );

        const enrichedNodes = enrichNodesWithState(layoutedNodes);
        setNodesState(enrichedNodes);
        setEdgesState(layoutedEdges);

        // Fit view after layout
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
        }, 50);
      } catch (error) {
        console.error('Layout failed:', error);
      } finally {
        setIsLayouting(false);
      }
    };

    runLayout();
  }, [taxonomyNodes, getLayoutedElements, enrichNodesWithState, setNodesState, setEdgesState, fitView]);

  // Update node data (selection/highlight state) without changing positions
  useEffect(() => {
    setNodesState((currentNodes) => {
      if (currentNodes.length === 0) return currentNodes;
      return enrichNodesWithState(currentNodes);
    });
  }, [selectedNodeId, searchTerm, onContextMenu, onAddChild, levelColors, audienceColors, geographyColors, enrichNodesWithState, setNodesState]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Auto-organize: re-run ELK layout and fit to view
  const handleAutoOrganize = useCallback(async () => {
    setIsLayouting(true);
    try {
      const { nodes: freshNodes, edges: freshEdges } = toReactFlowElements(taxonomyNodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        freshNodes,
        freshEdges
      );

      const enrichedNodes = enrichNodesWithState(layoutedNodes);
      setNodesState(enrichedNodes);
      setEdgesState(layoutedEdges);

      // Wait for layout to apply, then fit view
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    } catch (error) {
      console.error('Auto-organize failed:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [taxonomyNodes, getLayoutedElements, enrichNodesWithState, setNodesState, setEdgesState, fitView]);

  // Fit to screen only (no re-layout)
  const handleFitToScreen = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!containerRef.current || isExporting) return;

    setIsExporting(true);
    try {
      // First auto-organize with ELK
      const { nodes: freshNodes, edges: freshEdges } = toReactFlowElements(taxonomyNodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        freshNodes,
        freshEdges
      );

      setNodesState(layoutedNodes);
      setEdgesState(layoutedEdges);

      // Wait for layout to apply
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fit view to ensure all nodes are visible
      fitView({ padding: 0.3, duration: 0 });

      // Wait for fit view to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate filename based on what's being exported
      const pillarNode = selectedPillar ? taxonomyNodes.find((n) => n.id === selectedPillar) : null;
      const filename = pillarNode
        ? `taxonomy-${pillarNode.name.toLowerCase().replace(/\s+/g, '-')}`
        : 'taxonomy-full';

      await exportReactFlowToPDF(containerRef.current, {
        filename,
        scale: 2,
        backgroundColor: '#f8fafc',
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, taxonomyNodes, getLayoutedElements, setNodesState, setEdgesState, fitView, selectedPillar]);

  // Custom minimap node color based on level
  const nodeColor = useCallback(
    (node: Node) => {
      const level = node.data?.level as TaxonomyLevel;
      if (level) {
        const customColors = levelColors?.[level] || DEFAULT_LEVEL_COLORS_HEX[level];
        return customColors.dot;
      }
      return '#cbd5e1';
    },
    [levelColors]
  );

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Loading overlay */}
      {isLayouting && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">Organizing layout...</span>
          </div>
        </div>
      )}

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
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
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
              disabled={isLayouting}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Re-organize and center the tree"
            >
              {isLayouting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
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
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg shadow-sm border border-blue-600 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={selectedPillar ? 'Export current pillar to PDF' : 'Export full taxonomy to PDF'}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
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
export function TreeView(props: TreeViewProps) {
  return (
    <ReactFlowProvider>
      <TreeViewInner {...props} />
    </ReactFlowProvider>
  );
}
