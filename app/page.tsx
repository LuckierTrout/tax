'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaxonomyNode, TaxonomySettings, ViewMode, TaxonomyLevel } from '@/types/taxonomy';
import { filterByPillar, searchNodes, getNodesByLevel } from '@/lib/tree-utils';
import { getChildLevel, LEVEL_LABELS, LEVEL_CHILDREN } from '@/config/levels';

import { TreeView, TreeViewExportFunctions } from '@/components/TreeView';
import { ColumnView } from '@/components/ColumnView';
import { ViewToggle } from '@/components/ViewToggle';
import { PillarSelector } from '@/components/PillarSelector';
import { SearchFilter } from '@/components/SearchFilter';
import { ExportMenu } from '@/components/ExportMenu';
import { NodePanel } from '@/components/NodePanel';
import { NodeForm } from '@/components/NodeForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ContextMenu } from '@/components/ContextMenu';
import { Plus, Settings } from 'lucide-react';

interface FormState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  level: TaxonomyLevel;
  parentId: string | null;
  parentName?: string;
  nodeId?: string;
  initialData?: { name: string; description?: string; objective?: string; notes?: string };
}

interface DeleteState {
  isOpen: boolean;
  nodeId: string;
  nodeName: string;
  descendantCount: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

export default function TaxonomyPage() {
  // Data state
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [settings, setSettings] = useState<TaxonomySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Export functions from TreeView
  const [exportFns, setExportFns] = useState<TreeViewExportFunctions | null>(null);

  // Fetch data
  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/taxonomy');
      if (!res.ok) throw new Error('Failed to fetch taxonomy');
      const data = await res.json();
      setNodes(data.nodes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    fetchSettings();
  }, [fetchNodes, fetchSettings]);

  // Get filtered nodes based on pillar selection and search
  const filteredNodes = (() => {
    let result = nodes;
    if (selectedPillarId) {
      result = filterByPillar(result, selectedPillarId);
    }
    if (searchTerm) {
      result = searchNodes(result, searchTerm);
    }
    return result;
  })();

  // Get pillars for selector
  const pillars = getNodesByLevel(nodes, 'pillar');

  // Get selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Handlers
  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleAddNode = (parentId: string | null, level: TaxonomyLevel) => {
    const parent = parentId ? nodes.find((n) => n.id === parentId) : null;
    setFormState({
      isOpen: true,
      mode: 'create',
      level,
      parentId,
      parentName: parent?.name,
    });
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    const descendants = nodes.filter((n) => {
      let current = n;
      while (current.parentId) {
        if (current.parentId === selectedNode.id) return true;
        current = nodes.find((p) => p.id === current.parentId) || current;
        if (current.parentId === null) break;
      }
      return false;
    });

    setDeleteState({
      isOpen: true,
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      descendantCount: descendants.length,
    });
  };

  // Inline update handler for NodePanel
  const handleUpdateNode = useCallback(async (nodeId: string, data: Partial<TaxonomyNode>) => {
    const res = await fetch(`/api/taxonomy/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update node');
    const { node } = await res.json();
    setNodes((prev) =>
      prev.map((n) => (n.id === node.id ? node : n))
    );
  }, []);

  const handleFormSubmit = async (data: { name: string; description?: string; objective?: string; notes?: string }) => {
    if (!formState) return;

    setIsSubmitting(true);
    try {
      if (formState.mode === 'create') {
        const res = await fetch('/api/taxonomy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            objective: data.objective,
            notes: data.notes,
            parentId: formState.parentId,
          }),
        });

        if (!res.ok) throw new Error('Failed to create node');
        const { node } = await res.json();
        setNodes((prev) => [...prev, node]);
        setSelectedNodeId(node.id);
      } else {
        const res = await fetch(`/api/taxonomy/${formState.nodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error('Failed to update node');
        const { node } = await res.json();
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? node : n))
        );
      }

      setFormState(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteState) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/taxonomy/${deleteState.nodeId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete node');
      const { deleted } = await res.json();

      setNodes((prev) => prev.filter((n) => !deleted.includes(n.id)));
      setSelectedNodeId(null);
      setDeleteState(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/taxonomy/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taxonomy.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleAddChildFromPanel = () => {
    if (!selectedNode) return;
    const childLevel = getChildLevel(selectedNode.level);
    if (!childLevel) return;
    handleAddNode(selectedNode.id, childLevel);
  };

  // Handler for adding child from TreeView node (plus button)
  const handleAddChildFromTree = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const childLevel = getChildLevel(node.level);
    if (!childLevel) return;
    handleAddNode(nodeId, childLevel);
  }, [nodes, handleAddNode]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;

    setFormState({
      isOpen: true,
      mode: 'edit',
      level: node.level,
      parentId: node.parentId,
      nodeId: node.id,
      initialData: {
        name: node.name,
        description: node.description,
        objective: node.objective,
        notes: node.notes,
      },
    });
  }, [contextMenu, nodes]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;

    const descendants = nodes.filter((n) => {
      let current = n;
      while (current.parentId) {
        if (current.parentId === node.id) return true;
        current = nodes.find((p) => p.id === current.parentId) || current;
        if (current.parentId === null) break;
      }
      return false;
    });

    setDeleteState({
      isOpen: true,
      nodeId: node.id,
      nodeName: node.name,
      descendantCount: descendants.length,
    });
  }, [contextMenu, nodes]);

  // Move Up: Node becomes sibling of its current parent (one level higher)
  const handleMoveUp = useCallback(async () => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node || !node.parentId) return; // Can't move up if no parent (pillar)

    const parent = nodes.find((n) => n.id === node.parentId);
    if (!parent) return;

    // New parent becomes the grandparent (parent's parent)
    const newParentId = parent.parentId;
    // New level becomes parent's level
    const newLevel = parent.level;

    try {
      const res = await fetch(`/api/taxonomy/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: newParentId, level: newLevel }),
      });

      if (!res.ok) throw new Error('Failed to move node up');
      const { node: updatedNode } = await res.json();
      setNodes((prev) =>
        prev.map((n) => (n.id === updatedNode.id ? updatedNode : n))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Move failed');
    }
  }, [contextMenu, nodes]);

  // Move Down: Node becomes child of one of its siblings (one level lower)
  const handleMoveDown = useCallback(async () => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;

    // Check if node can move down (subtopics can't)
    const childLevel = LEVEL_CHILDREN[node.level];
    if (!childLevel) return;

    // Find siblings (nodes with same parent, excluding self)
    const siblings = nodes.filter(
      (n) => n.parentId === node.parentId && n.id !== node.id
    );

    if (siblings.length === 0) {
      alert('No sibling available to become the new parent');
      return;
    }

    // Use the first sibling (by order) as the new parent
    const sortedSiblings = siblings.sort((a, b) => a.order - b.order);
    const newParent = sortedSiblings[0];

    // New level is child level
    const newLevel = childLevel;

    try {
      const res = await fetch(`/api/taxonomy/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: newParent.id, level: newLevel }),
      });

      if (!res.ok) throw new Error('Failed to move node down');
      const { node: updatedNode } = await res.json();
      setNodes((prev) =>
        prev.map((n) => (n.id === updatedNode.id ? updatedNode : n))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Move failed');
    }
  }, [contextMenu, nodes]);

  // Helper to check if node can move up (has a parent)
  const canMoveUp = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? !!node.parentId : false;
  }, [nodes]);

  // Helper to check if node can move down (not subtopic and has siblings)
  const canMoveDown = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    // Can't move down if already at bottom level
    if (!LEVEL_CHILDREN[node.level]) return false;
    // Need siblings to become parent
    const siblings = nodes.filter(
      (n) => n.parentId === node.parentId && n.id !== node.id
    );
    return siblings.length > 0;
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading taxonomy...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Corporate Affairs Taxonomy
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your communications hierarchy
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchFilter value={searchTerm} onChange={setSearchTerm} />
            <ExportMenu
              onExport={handleExport}
              onExportPDF={exportFns?.exportPDF}
              onExportSVG={exportFns?.exportSVG}
              onExportJPG={exportFns?.exportJPG}
              onExportPNG={exportFns?.exportPNG}
              showImageOptions={viewMode === 'tree'}
            />
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleAddNode(null, 'pillar')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Add Pillar
            </button>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <PillarSelector
          pillars={pillars}
          selectedPillarId={selectedPillarId}
          onChange={setSelectedPillarId}
        />
        <ViewToggle mode={viewMode} onChange={setViewMode} />
        <div className="ml-auto text-sm text-gray-500">
          {filteredNodes.length} items
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* View Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'tree' ? (
            <TreeView
              taxonomyNodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              searchTerm={searchTerm}
              onNodeSelect={handleNodeSelect}
              selectedPillar={selectedPillarId}
              onContextMenu={handleContextMenu}
              onAddChild={handleAddChildFromTree}
              levelColors={settings?.levelColors}
              audienceColors={settings?.audienceColors}
              geographyColors={settings?.geographyColors}
              onExportReady={setExportFns}
            />
          ) : (
            <ColumnView
              taxonomyNodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              searchTerm={searchTerm}
              onNodeSelect={handleNodeSelect}
              onAddNode={handleAddNode}
            />
          )}
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <NodePanel
            node={selectedNode}
            allNodes={nodes}
            settings={settings}
            onClose={() => setSelectedNodeId(null)}
            onDelete={handleDeleteNode}
            onAddChild={handleAddChildFromPanel}
            onUpdate={handleUpdateNode}
          />
        )}
      </div>

      {/* Modals */}
      {formState && (
        <NodeForm
          mode={formState.mode}
          level={formState.level}
          parentName={formState.parentName}
          initialData={formState.initialData}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormState(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete Node"
          message={
            deleteState.descendantCount > 0
              ? `Are you sure you want to delete "${deleteState.nodeName}" and its ${deleteState.descendantCount} descendant(s)? This action cannot be undone.`
              : `Are you sure you want to delete "${deleteState.nodeName}"? This action cannot be undone.`
          }
          confirmLabel="Delete"
          isDestructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteState(null)}
          isLoading={isSubmitting}
        />
      )}

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={setSettings}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onClose={handleContextMenuClose}
          canMoveUp={canMoveUp(contextMenu.nodeId)}
          canMoveDown={canMoveDown(contextMenu.nodeId)}
        />
      )}
    </div>
  );
}
