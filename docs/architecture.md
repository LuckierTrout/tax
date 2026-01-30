# Architecture Documentation

## System Overview

The Corporate Affairs Taxonomy Manager is a Next.js 16 single-page application with a file-based data persistence layer. It follows a component-based architecture with clear separation between presentation, business logic, and data access layers.

## Architecture Pattern

**Pattern:** Component-Based SPA with File-Based Persistence

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  React Components (UI Layer)                                 │
│  ├── TreeView (ReactFlow-based)                             │
│  ├── ColumnView (Miller columns)                            │
│  ├── NodePanel (Detail/Edit sidebar)                        │
│  ├── NodeForm (Create/Edit modal)                           │
│  └── SettingsPanel (Configuration modal)                    │
├─────────────────────────────────────────────────────────────┤
│  State Management (React useState)                          │
│  ├── nodes: TaxonomyNode[]                                  │
│  ├── settings: TaxonomySettings                             │
│  ├── viewMode: 'tree' | 'column'                            │
│  └── selection/filter state                                 │
├─────────────────────────────────────────────────────────────┤
│  Utilities (lib/)                                           │
│  ├── tree-utils.ts - Tree operations                        │
│  ├── pdf-export.ts - PDF generation                         │
│  └── storage.ts - Data access (server-only)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP (fetch)
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                        │
├─────────────────────────────────────────────────────────────┤
│  /api/taxonomy      - GET (list), POST (create)             │
│  /api/taxonomy/[id] - GET, PUT, DELETE                      │
│  /api/taxonomy/export - GET (json|csv)                      │
│  /api/settings      - GET, PUT                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ File I/O
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (JSON File)                    │
├─────────────────────────────────────────────────────────────┤
│  /data/taxonomy.json                                        │
│  {                                                          │
│    nodes: TaxonomyNode[],                                   │
│    settings: TaxonomySettings,                              │
│    metadata: { version, lastModified }                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. File-Based Storage (No Database)

**Decision:** Use JSON file storage instead of a database.

**Rationale:**
- Simple deployment (no database setup required)
- Data is easily portable and human-readable
- Suitable for single-user or low-concurrency scenarios
- Atomic writes using temp file + rename pattern

**Trade-offs:**
- Not suitable for high concurrency
- No built-in querying capabilities
- Limited scalability

**Implementation:** `/lib/storage.ts`
```typescript
// Atomic write pattern
const tempPath = `${DATA_FILE_PATH}.tmp`;
await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
await fs.rename(tempPath, DATA_FILE_PATH);
```

### 2. Client-Side State with React useState

**Decision:** Use React's built-in useState instead of external state management.

**Rationale:**
- Application state is relatively simple
- All state is co-located in the main page component
- No need for complex state synchronization
- Reduces bundle size and complexity

**State Structure:**
```typescript
// Data state
const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
const [settings, setSettings] = useState<TaxonomySettings | null>(null);

// View state
const [viewMode, setViewMode] = useState<ViewMode>('tree');
const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');

// Modal state
const [formState, setFormState] = useState<FormState | null>(null);
const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
```

### 3. Strict 5-Level Hierarchy

**Decision:** Enforce a fixed 5-level taxonomy hierarchy.

**Rationale:**
- Domain requirement for Corporate Affairs taxonomy
- Simplifies UI/UX - users know exactly what levels exist
- Enables level-specific features (colors, objectives)
- Prevents infinite nesting complexity

**Implementation:** `/config/levels.ts`
```typescript
export const LEVEL_HIERARCHY: Record<TaxonomyLevel, TaxonomyLevel | null> = {
  pillar: null,
  narrative_theme: 'pillar',
  subject: 'narrative_theme',
  topic: 'subject',
  subtopic: 'topic',
};
```

### 4. Dual View Architecture

**Decision:** Provide both Tree and Column views as primary navigation modes.

**Rationale:**
- Tree view shows relationships visually
- Column view enables quick drilling down
- Different mental models for different users
- Both views share the same data source

**Components:**
- `TreeView` - Uses @xyflow/react for interactive diagrams
- `ColumnView` - Miller columns implementation

## Data Flow

### Create Node Flow
```
User clicks "Add" → NodeForm opens → User submits form
                                           │
                                           ▼
                              POST /api/taxonomy
                                           │
                                           ▼
                              createNode() in storage.ts
                                           │
                                           ▼
                              Write to taxonomy.json
                                           │
                                           ▼
                              Return new node to client
                                           │
                                           ▼
                              setNodes([...nodes, newNode])
                                           │
                                           ▼
                              React re-renders views
```

### Search Flow
```
User types search term → setSearchTerm(value)
                                │
                                ▼
                   filteredNodes = searchNodes(nodes, term)
                                │
                                ▼
                   Views receive filteredNodes as prop
                                │
                                ▼
                   Matching nodes highlighted
```

## Component Architecture

### Component Hierarchy
```
TaxonomyPage (app/page.tsx)
├── Header
│   ├── SearchFilter
│   ├── ExportMenu
│   └── SettingsPanel (modal)
├── Controls Bar
│   ├── PillarSelector
│   └── ViewToggle
├── Main Content
│   ├── TreeView (conditional)
│   │   ├── ReactFlow
│   │   │   └── TaxonomyNode (custom node)
│   │   └── useTreeLayout (hook)
│   └── ColumnView (conditional)
│       └── Column (repeated)
├── NodePanel (sidebar, conditional)
└── Modals
    ├── NodeForm
    └── ConfirmDialog
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| TaxonomyPage | Main orchestrator, state management, API calls |
| TreeView | ReactFlow integration, layout calculation, PDF export |
| ColumnView | Miller columns navigation, level-based display |
| NodePanel | Node detail display, inline editing, actions |
| NodeForm | Create/edit node modal with validation |
| SettingsPanel | Manage audiences and geographies |

## API Design

### REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/taxonomy | Fetch all nodes |
| POST | /api/taxonomy | Create a node |
| GET | /api/taxonomy/[id] | Fetch single node |
| PUT | /api/taxonomy/[id] | Update a node |
| DELETE | /api/taxonomy/[id] | Delete node + descendants |
| GET | /api/taxonomy/export | Export as JSON or CSV |
| GET | /api/settings | Fetch settings |
| PUT | /api/settings | Update settings |

### Request/Response Validation

All API routes use Zod schemas for validation:

```typescript
const CreateNodeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  parentId: z.string().nullable(),
});
```

## Security Considerations

1. **Input Validation:** All API inputs validated with Zod schemas
2. **No Authentication:** Currently no auth (single-user assumption)
3. **No SQL Injection:** No database, file-based storage
4. **XSS Prevention:** React's built-in escaping

## Performance Considerations

1. **Full Data Load:** All nodes loaded on page load (suitable for ~1000s of nodes)
2. **Client-side Filtering:** Search and filter operations run in browser
3. **Memoization:** React useMemo for computed values (filteredNodes, tree structure)
4. **Layout Caching:** TreeView preserves node positions between renders

## Known Limitations

1. **Single User:** No multi-user support or conflict resolution
2. **No Undo:** Destructive operations are immediate
3. **Memory Bound:** Large taxonomies may impact browser performance
4. **No Pagination:** All data loaded at once

## Future Enhancement Areas

1. **Auto-Organize Improvement:** Better horizontal/vertical alignment in tree layout
2. **Database Migration:** Move to SQLite or PostgreSQL for scalability
3. **Authentication:** Add user auth for multi-user scenarios
4. **Undo/Redo:** Implement operation history
5. **Drag-and-Drop Reordering:** In both tree and column views

---
*Generated by BMAD Document Project Workflow v1.2.0*
