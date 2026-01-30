# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Corporate Affairs Taxonomy Manager - a Next.js application for creating and managing hierarchical communication taxonomies. The app provides both tree and column views for navigating a 5-level taxonomy structure with export capabilities.

## Development Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Production server
npm start

# Linting
npm run lint
```

## Architecture

### Taxonomy Hierarchy

The application enforces a strict 5-level hierarchy defined in `/config/levels.ts`:

1. **Pillar** (top level)
2. **Narrative Theme** (child of Pillar)
3. **Subject** (child of Narrative Theme)
4. **Topic** (child of Subject)
5. **Subtopic** (child of Topic, cannot have children)

Each level has specific colors and constraints. Only Pillar, Narrative Theme, and Subject support objectives (max 5 lines). All nodes can have audiences and geographies assigned.

### Data Storage

**File-based JSON storage** at `/data/taxonomy.json`:
- All data operations go through `/lib/storage.ts`
- Atomic writes using temp file + rename pattern
- No database - data persists in JSON with metadata tracking
- Structure: `{ nodes: TaxonomyNode[], settings: TaxonomySettings, metadata: {...} }`

### API Routes

All routes under `/app/api/taxonomy/`:
- `GET /api/taxonomy` - Fetch all nodes
- `POST /api/taxonomy` - Create node (auto-assigns level based on parent)
- `PUT /api/taxonomy/[id]` - Update node
- `DELETE /api/taxonomy/[id]` - Delete node + descendants
- `GET /api/taxonomy/export?format=json|csv` - Export data
- `GET /api/settings` - Get audiences/geographies
- `PUT /api/settings` - Update audiences/geographies

### State Management

Client-side state in `/app/page.tsx`:
- **Data state**: nodes, settings loaded from API
- **View state**: viewMode ('tree' | 'column'), selectedPillarId, selectedNodeId, searchTerm
- **Modal state**: form dialogs, delete confirmations, settings panel

All state updates trigger React re-renders. No global state management library.

### Key Utilities

**`/lib/tree-utils.ts`** - Core tree operations:
- `buildTree()` - Convert flat nodes to nested TreeNode[] structure
- `filterByPillar()` - Filter nodes by pillar ancestry
- `searchNodes()` - Search with ancestor/descendant inclusion
- `getDescendants()` - Get all child IDs recursively
- `toReactFlowElements()` - Convert to ReactFlow format for tree view

**`/lib/pdf-export.ts`** - PDF generation using html2canvas + jsPDF

### Component Structure

- **TreeView** - Interactive flow diagram using @xyflow/react
- **ColumnView** - Miller columns navigation (like macOS Finder)
- **NodePanel** - Right sidebar for editing selected node
- **NodeForm** - Modal for create/edit operations
- **SettingsPanel** - Manage audiences/geographies

### Type System

All types in `/types/taxonomy.ts`:
- `TaxonomyNode` - Core node with id, name, description, objective, notes, audiences, geographies, parentId, level, order
- `TaxonomyLevel` - Union type of 5 hierarchy levels
- `TreeNode` - Extends TaxonomyNode with children array
- `ViewMode` - 'tree' | 'column'

### Important Patterns

1. **Level Validation**: Parent-child relationships must follow hierarchy. Creating a node under a parent automatically assigns the correct child level.

2. **Order Management**: Nodes have an `order` field for sibling ordering. New nodes append to end of siblings.

3. **Cascading Deletes**: Deleting a node deletes all descendants. Backend returns array of deleted IDs.

4. **Search Behavior**: Searching includes matches + all ancestors and descendants to maintain context.

5. **Pillar Filtering**: When a pillar is selected, only that pillar and its descendants are shown.

## Path Alias

`@/*` resolves to project root - use for all imports (e.g., `@/types/taxonomy`, `@/lib/storage`)

## Dependencies Note

- **@xyflow/react** - Flow diagram library for tree visualization
- **react-hook-form** + **zod** - Form handling and validation
- **html2canvas** + **jspdf** - PDF export from rendered components
- **nanoid** - Generate short unique IDs for nodes
- **lucide-react** - Icon library
