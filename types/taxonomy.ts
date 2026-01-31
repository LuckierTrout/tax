export type TaxonomyLevel =
  | 'pillar'
  | 'narrative_theme'
  | 'subject'
  | 'topic'
  | 'subtopic';

export interface TaxonomyNode {
  id: string;
  name: string;
  description?: string;
  objective?: string; // Optional objective for pillar, narrative_theme, subject (max 5 lines)
  notes?: string; // Internal notes (not displayed in chart, but exported)
  audiences?: string[]; // Selected audiences for this node
  geographies?: string[]; // Selected geographies for this node
  parentId: string | null;
  level: TaxonomyLevel;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Levels that support objectives
export const LEVELS_WITH_OBJECTIVE: TaxonomyLevel[] = ['pillar', 'narrative_theme', 'subject'];

// Color configuration for a single level
export interface LevelColorConfig {
  bg: string;      // Background color hex (e.g., "#F5F3FF")
  border: string;  // Border color hex (e.g., "#A78BFA")
  dot: string;     // Dot/text color hex (e.g., "#A855F7")
}

// Settings for managing available options
export interface TaxonomySettings {
  availableAudiences: string[];
  availableGeographies: string[];
  levelColors?: Record<TaxonomyLevel, LevelColorConfig>;
}

export interface TaxonomyData {
  nodes: TaxonomyNode[];
  settings: TaxonomySettings;
  metadata: {
    version: string;
    lastModified: string;
  };
}

export interface TreeNode extends TaxonomyNode {
  children: TreeNode[];
}

// API request/response types
export interface CreateNodeRequest {
  name: string;
  description?: string;
  objective?: string;
  notes?: string;
  parentId: string | null;
}

export interface UpdateNodeRequest {
  name?: string;
  description?: string;
  objective?: string;
  notes?: string;
  audiences?: string[];
  geographies?: string[];
}

export interface ReorderRequest {
  nodeId: string;
  newParentId?: string | null;
  newOrder: number;
}

// View state types
export type ViewMode = 'tree' | 'column';

export interface ViewState {
  mode: ViewMode;
  selectedPillarId: string | null; // null = all pillars
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  searchTerm: string;
}
