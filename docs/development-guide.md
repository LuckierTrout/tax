# Development Guide

## Prerequisites

- **Node.js** 18.x or higher (LTS recommended)
- **npm** 9.x or higher (comes with Node.js)
- **Git** for version control

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd tax

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Start production server (requires build first) |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
tax/
├── app/                  # Next.js App Router pages and API routes
├── components/           # React components
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
├── config/               # Application configuration
├── data/                 # JSON data storage
├── public/               # Static assets
└── docs/                 # Documentation
```

---

## Development Workflow

### Creating a New Component

1. Create file in `components/` directory
2. Add `'use client';` directive at top (for client components)
3. Define TypeScript interface for props
4. Export component

**Example:**
```typescript
// components/MyComponent.tsx
'use client';

interface MyComponentProps {
  title: string;
  onClick: () => void;
}

export function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <button onClick={onClick}>
      {title}
    </button>
  );
}
```

### Adding a New API Route

1. Create file under `app/api/` following Next.js conventions
2. Export async handler functions (GET, POST, PUT, DELETE)
3. Use Zod for request validation
4. Return NextResponse

**Example:**
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }

  // Process request...
  return NextResponse.json({ success: true });
}
```

### Modifying the Data Model

1. Update types in `types/taxonomy.ts`
2. Update storage functions in `lib/storage.ts` if needed
3. Update API routes to handle new fields
4. Update components to display/edit new fields

---

## Import Aliases

Use `@/` prefix for absolute imports from project root:

```typescript
import { TaxonomyNode } from '@/types/taxonomy';
import { LEVEL_COLORS } from '@/config/levels';
import { buildTree } from '@/lib/tree-utils';
```

---

## Styling

This project uses **Tailwind CSS 4** with PostCSS.

### Adding Custom Styles

1. Add utility classes directly in JSX
2. Use `clsx` for conditional classes
3. Add global styles in `app/globals.css` if needed

**Example:**
```tsx
import clsx from 'clsx';

<div className={clsx(
  'px-4 py-2 rounded-lg',
  isActive ? 'bg-blue-500 text-white' : 'bg-gray-100'
)}>
  Content
</div>
```

### Level Colors

Use predefined colors from `config/levels.ts`:

```typescript
import { LEVEL_COLORS } from '@/config/levels';

const colors = LEVEL_COLORS['pillar'];
// colors.bg = 'bg-purple-50'
// colors.border = 'border-purple-400'
// colors.text = 'text-purple-900'
// colors.dot = 'bg-purple-500'
```

---

## Data Persistence

Data is stored in `/data/taxonomy.json`. The file is:
- Auto-created on first run with default values
- Updated atomically (write to temp file, then rename)
- Read on every API request (no caching)

### Resetting Data

Delete `/data/taxonomy.json` and restart the server. Default data will be regenerated.

### Backing Up Data

Simply copy the `/data/taxonomy.json` file.

---

## Testing

Currently no test suite is configured. To add tests:

1. Install testing libraries:
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```

2. Add test script to `package.json`:
   ```json
   "scripts": {
     "test": "vitest"
   }
   ```

3. Create test files with `.test.ts` or `.test.tsx` extension

---

## Common Tasks

### Adding a New Taxonomy Level

**Note:** The app enforces a strict 5-level hierarchy. Adding levels requires:

1. Update `TaxonomyLevel` union type in `types/taxonomy.ts`
2. Add to `LEVEL_HIERARCHY`, `LEVEL_CHILDREN`, `LEVEL_LABELS`, `LEVEL_COLORS`, `LEVEL_ORDER` in `config/levels.ts`
3. Update UI components to handle new level

### Adding a New Field to Nodes

1. Add field to `TaxonomyNode` interface in `types/taxonomy.ts`
2. Update Zod schemas in API routes
3. Add UI for editing the field in `NodePanel.tsx`
4. Update export logic in `app/api/taxonomy/export/route.ts`

### Modifying the Tree Layout

Edit `components/TreeView/useTreeLayout.ts`:
- `nodeWidth` - Default node width
- `nodeHeight` - Default node height
- `rankSep` - Vertical spacing between levels
- `nodeSep` - Horizontal spacing between siblings

---

## Debugging

### API Issues

Check browser Network tab for:
- Request payload
- Response status and body
- Error messages

### State Issues

Add console.log or use React DevTools to inspect:
- `nodes` array
- `selectedNodeId`
- `formState` / `deleteState`

### Layout Issues

In TreeView, check:
- Node positions in React DevTools
- `useTreeLayout` calculations
- ReactFlow viewport transform

---

## Known Issues

1. **Large Taxonomies:** Performance may degrade with 1000+ nodes
2. **Concurrent Edits:** No multi-user support or conflict resolution
3. **No Undo:** Destructive operations are immediate

---

## Environment Variables

Currently none required. If needed in future:

1. Create `.env.local` file
2. Add variables with `NEXT_PUBLIC_` prefix for client-side access
3. Access via `process.env.NEXT_PUBLIC_*`

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy

**Note:** File-based storage won't persist across deployments. For production, migrate to a database.

### Self-Hosted

```bash
npm run build
npm start
```

Requires Node.js runtime. Data file must be writable.

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [ReactFlow Documentation](https://reactflow.dev)
- [Zod Documentation](https://zod.dev)

---
*Generated by BMAD Document Project Workflow v1.2.0*
