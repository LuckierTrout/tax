# Component Inventory

## Overview

The application uses 13 React components organized by feature. All components are client-side (`'use client'`) and follow React functional component patterns with hooks.

## Component Hierarchy

```
TaxonomyPage (app/page.tsx)
├── Header Section
│   ├── SearchFilter
│   ├── ExportMenu
│   └── [Add Pillar Button]
├── Controls Bar
│   ├── PillarSelector
│   └── ViewToggle
├── Main Content Area
│   ├── TreeView (conditional)
│   │   └── TaxonomyNode (custom ReactFlow node)
│   └── ColumnView (conditional)
│       └── Column (repeated per level)
├── NodePanel (sidebar, when node selected)
└── Modal Layer
    ├── NodeForm
    ├── ConfirmDialog
    └── SettingsPanel
```

---

## View Components

### TreeView
**Path:** `components/TreeView/index.tsx`
**Lines:** 287

Interactive flow diagram using @xyflow/react library.

**Props:**
```typescript
interface TreeViewProps {
  taxonomyNodes: TaxonomyNode[];
  selectedNodeId: string | null;
  searchTerm: string;
  onNodeSelect: (nodeId: string | null) => void;
  selectedPillar: string | null;
}
```

**Features:**
- ReactFlow-based interactive diagram
- Auto-organize button (re-layouts nodes)
- Fit to screen button
- PDF export button
- MiniMap for navigation
- Background grid
- Zoom controls

**Dependencies:**
- @xyflow/react
- useTreeLayout hook
- TaxonomyNode component

---

### TaxonomyNode
**Path:** `components/TreeView/TaxonomyNode.tsx`
**Lines:** 114

Custom ReactFlow node component for taxonomy items.

**Props:** (via ReactFlow NodeProps)
```typescript
interface TaxonomyNodeData {
  label: string;
  level: TaxonomyLevel;
  description?: string;
  objective?: string;
  audiences?: string[];
  geographies?: string[];
  isSelected?: boolean;
  isHighlighted?: boolean;
}
```

**Features:**
- Level-specific colors (Tailwind classes)
- Objective display (top 3 levels only)
- Audience pills (blue)
- Geography pills (green)
- Selection ring
- Search highlight

---

### useTreeLayout (Hook)
**Path:** `components/TreeView/useTreeLayout.ts`
**Lines:** 169

Custom hook for calculating tree layout positions.

**Returns:**
```typescript
{
  getLayoutedElements: (nodes, edges, options?) => { nodes, edges }
}
```

**Algorithm:**
1. Build parent-child adjacency maps
2. Calculate depth (level) for each node
3. Calculate subtree widths recursively
4. Position nodes centered under parents
5. Ensure same Y-position for same-level nodes

**Options:**
```typescript
interface LayoutOptions {
  direction?: 'TB' | 'LR';     // Top-to-bottom (default)
  nodeWidth?: number;          // 180 (default)
  nodeHeight?: number;         // 70 (default)
  rankSep?: number;            // 120 (vertical spacing)
  nodeSep?: number;            // 40 (horizontal spacing)
}
```

---

### ColumnView
**Path:** `components/ColumnView/index.tsx`
**Lines:** 130

Miller columns navigation (macOS Finder-style).

**Props:**
```typescript
interface ColumnViewProps {
  taxonomyNodes: TaxonomyNode[];
  selectedNodeId: string | null;
  searchTerm: string;
  onNodeSelect: (nodeId: string | null) => void;
  onAddNode: (parentId: string | null, level: TaxonomyLevel) => void;
}
```

**Features:**
- Progressive disclosure (columns appear as you select)
- Selection path highlighting
- Add button per column
- Search term highlighting

---

### Column
**Path:** `components/ColumnView/Column.tsx`
**Lines:** 108

Single column component for ColumnView.

**Props:**
```typescript
interface ColumnProps {
  level: TaxonomyLevel;
  nodes: TaxonomyNode[];
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (nodeId: string) => void;
  onAdd: () => void;
  canAdd: boolean;
}
```

**Features:**
- Level-colored header
- Node count badge
- Scrollable item list
- Add button at bottom

---

## Panel Components

### NodePanel
**Path:** `components/NodePanel.tsx`
**Lines:** 422

Right sidebar for viewing and editing selected node.

**Props:**
```typescript
interface NodePanelProps {
  node: TaxonomyNode;
  allNodes: TaxonomyNode[];
  settings: TaxonomySettings | null;
  onClose: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onUpdate: (nodeId: string, data: Partial<TaxonomyNode>) => Promise<void>;
}
```

**Features:**
- Breadcrumb navigation
- Inline editing (name, objective, description, notes)
- Auto-save on blur
- Audience multi-select dropdown
- Geography multi-select dropdown
- Descendant statistics
- Metadata display (created/updated dates)
- Add child button
- Delete button

---

### SettingsPanel
**Path:** `components/SettingsPanel.tsx`
**Lines:** 230

Modal for managing audiences and geographies.

**Props:**
```typescript
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: TaxonomySettings) => void;
}
```

**Features:**
- Add/remove audiences
- Add/remove geographies
- Auto-save on changes
- Loading state

---

## Form Components

### NodeForm
**Path:** `components/NodeForm.tsx`
**Lines:** 194

Modal for creating or editing nodes.

**Props:**
```typescript
interface NodeFormProps {
  mode: 'create' | 'edit';
  level: TaxonomyLevel;
  parentName?: string;
  initialData?: { name: string; description?: string; objective?: string };
  onSubmit: (data: NodeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
```

**Features:**
- Zod schema validation
- react-hook-form integration
- Objective field (conditionally shown)
- Level-colored indicator
- Loading state

---

### ConfirmDialog
**Path:** `components/ConfirmDialog.tsx`
**Lines:** 64

Generic confirmation modal for destructive actions.

**Props:**
```typescript
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Features:**
- Warning icon for destructive actions
- Customizable labels
- Loading state

---

## UI Components

### ViewToggle
**Path:** `components/ViewToggle.tsx`
**Lines:** 41

Toggle between Tree and Column views.

**Props:**
```typescript
interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}
```

---

### PillarSelector
**Path:** `components/PillarSelector.tsx`
**Lines:** 100

Dropdown to filter by pillar.

**Props:**
```typescript
interface PillarSelectorProps {
  pillars: TaxonomyNode[];
  selectedPillarId: string | null;
  onChange: (pillarId: string | null) => void;
}
```

---

### SearchFilter
**Path:** `components/SearchFilter.tsx`
**Lines:** 43

Search input with clear button.

**Props:**
```typescript
interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

---

### ExportMenu
**Path:** `components/ExportMenu.tsx`
**Lines:** 70

Dropdown menu for export options.

**Props:**
```typescript
interface ExportMenuProps {
  onExport: (format: 'json' | 'csv') => void;
}
```

---

## Component Statistics

| Component | Lines | Props | Hooks Used |
|-----------|-------|-------|------------|
| TreeView | 287 | 5 | useState, useCallback, useEffect, useMemo, useRef |
| TaxonomyNode | 114 | - | memo |
| useTreeLayout | 169 | - | useCallback |
| ColumnView | 130 | 5 | useMemo |
| Column | 108 | 7 | - |
| NodePanel | 422 | 7 | useState, useEffect, useCallback, useRef |
| SettingsPanel | 230 | 3 | useState, useEffect |
| NodeForm | 194 | 7 | useForm (react-hook-form) |
| ConfirmDialog | 64 | 8 | - |
| ViewToggle | 41 | 2 | - |
| PillarSelector | 100 | 3 | useState, useRef, useEffect |
| SearchFilter | 43 | 3 | useRef |
| ExportMenu | 70 | 1 | useState, useRef, useEffect |

---
*Generated by BMAD Document Project Workflow v1.2.0*
