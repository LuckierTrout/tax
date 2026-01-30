# Source Tree Analysis

## Directory Structure

```
tax/
├── app/                          # Next.js App Router
│   ├── api/                      # API Route Handlers
│   │   ├── taxonomy/
│   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   ├── [id]/
│   │   │   │   └── route.ts      # GET, PUT, DELETE single node
│   │   │   └── export/
│   │   │       └── route.ts      # GET export (json|csv)
│   │   └── settings/
│   │       └── route.ts          # GET, PUT settings
│   ├── globals.css               # Global styles (Tailwind)
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main application page (387 lines)
│
├── components/                   # React UI Components
│   ├── TreeView/                 # Flow diagram visualization
│   │   ├── index.tsx             # Main TreeView with ReactFlow (287 lines)
│   │   ├── TaxonomyNode.tsx      # Custom node component (114 lines)
│   │   └── useTreeLayout.ts      # Tree layout algorithm (169 lines)
│   ├── ColumnView/               # Miller columns navigation
│   │   ├── index.tsx             # Main ColumnView (130 lines)
│   │   └── Column.tsx            # Single column component (108 lines)
│   ├── NodePanel.tsx             # Detail/edit sidebar (422 lines)
│   ├── NodeForm.tsx              # Create/edit modal (194 lines)
│   ├── ConfirmDialog.tsx         # Delete confirmation (64 lines)
│   ├── SettingsPanel.tsx         # Settings modal (230 lines)
│   ├── ViewToggle.tsx            # Tree/Column toggle (41 lines)
│   ├── PillarSelector.tsx        # Pillar filter dropdown (100 lines)
│   ├── SearchFilter.tsx          # Search input (43 lines)
│   └── ExportMenu.tsx            # Export dropdown (70 lines)
│
├── lib/                          # Utility Functions
│   ├── storage.ts                # Data access layer (176 lines)
│   ├── tree-utils.ts             # Tree operations (173 lines)
│   └── pdf-export.ts             # PDF generation (197 lines)
│
├── types/                        # TypeScript Definitions
│   └── taxonomy.ts               # All domain types (78 lines)
│
├── config/                       # Application Configuration
│   └── levels.ts                 # Hierarchy configuration (79 lines)
│
├── data/                         # Data Storage
│   └── taxonomy.json             # Persistent data file
│
├── public/                       # Static Assets
│   └── (empty)
│
├── docs/                         # Generated Documentation
│   └── (this folder)
│
└── Configuration Files
    ├── package.json              # Dependencies and scripts
    ├── tsconfig.json             # TypeScript configuration
    ├── next.config.ts            # Next.js configuration
    ├── postcss.config.mjs        # PostCSS (Tailwind)
    ├── eslint.config.mjs         # ESLint configuration
    ├── CLAUDE.md                 # AI assistant context
    └── README.md                 # Project readme
```

## Critical Directories

### `/app` - Next.js App Router
The main application entry point using Next.js 16 App Router conventions.

**Key Files:**
- `page.tsx` - Main SPA with all state management (largest file at 387 lines)
- `layout.tsx` - Root layout with metadata
- `globals.css` - Tailwind directives

### `/app/api` - REST API Layer
Server-side API routes handling all data operations.

**Endpoints:**
- `/api/taxonomy` - Node CRUD operations
- `/api/settings` - Configuration management
- `/api/taxonomy/export` - Data export

### `/components` - UI Components
Reusable React components organized by feature.

**Subfolders:**
- `TreeView/` - ReactFlow-based visualization (3 files)
- `ColumnView/` - Miller columns navigation (2 files)

### `/lib` - Business Logic
Shared utility functions and data access.

**Files:**
- `storage.ts` - File-based data persistence
- `tree-utils.ts` - Tree manipulation algorithms
- `pdf-export.ts` - PDF generation with html2canvas

### `/types` - Type Definitions
Central TypeScript type definitions.

**Contains:**
- `TaxonomyNode` - Core data model
- `TaxonomyLevel` - Union type of 5 levels
- `TaxonomySettings` - Audiences/geographies config
- `ViewMode`, `ViewState` - UI state types
- API request/response types

### `/config` - Configuration
Application constants and configuration.

**Contains:**
- `LEVEL_HIERARCHY` - Parent-child relationships
- `LEVEL_COLORS` - Tailwind color classes per level
- `LEVEL_LABELS` - Display names

### `/data` - Persistent Storage
File-based data storage.

**Contains:**
- `taxonomy.json` - All nodes, settings, metadata

## File Statistics

| Directory | Files | Lines of Code |
|-----------|-------|---------------|
| app/ | 7 | ~550 |
| components/ | 13 | ~1,800 |
| lib/ | 3 | ~550 |
| types/ | 1 | ~80 |
| config/ | 1 | ~80 |
| **Total** | **25** | **~3,060** |

## Entry Points

1. **Application Entry:** `app/page.tsx`
   - Client component ('use client')
   - All application state managed here
   - Renders TreeView or ColumnView based on viewMode

2. **API Entry:** `app/api/taxonomy/route.ts`
   - GET handler for listing nodes
   - POST handler for creating nodes

3. **Data Entry:** `lib/storage.ts`
   - `readTaxonomyData()` - Load data
   - `writeTaxonomyData()` - Save data
   - Handles file initialization on first run

## Import Aliases

Path alias configured in `tsconfig.json`:
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

**Usage:**
```typescript
import { TaxonomyNode } from '@/types/taxonomy';
import { storage } from '@/lib/storage';
import { LEVEL_COLORS } from '@/config/levels';
```

---
*Generated by BMAD Document Project Workflow v1.2.0*
