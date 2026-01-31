import { TaxonomyLevel, LevelColorConfig, PillColorConfig } from '@/types/taxonomy';

export const LEVEL_HIERARCHY: Record<TaxonomyLevel, TaxonomyLevel | null> = {
  pillar: null,
  narrative_theme: 'pillar',
  subject: 'narrative_theme',
  topic: 'subject',
  subtopic: 'topic',
};

export const LEVEL_CHILDREN: Record<TaxonomyLevel, TaxonomyLevel | null> = {
  pillar: 'narrative_theme',
  narrative_theme: 'subject',
  subject: 'topic',
  topic: 'subtopic',
  subtopic: null,
};

export const LEVEL_LABELS: Record<TaxonomyLevel, string> = {
  pillar: 'Pillar',
  narrative_theme: 'Narrative Theme',
  subject: 'Subject',
  topic: 'Topic',
  subtopic: 'Subtopic',
};

export const LEVEL_COLORS: Record<TaxonomyLevel, { bg: string; border: string; text: string; dot: string }> = {
  pillar: {
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-900',
    dot: 'bg-purple-500',
  },
  narrative_theme: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-900',
    dot: 'bg-blue-500',
  },
  subject: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-900',
    dot: 'bg-green-500',
  },
  topic: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    dot: 'bg-yellow-500',
  },
  subtopic: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-900',
    dot: 'bg-orange-500',
  },
};

export const LEVEL_ORDER: TaxonomyLevel[] = [
  'pillar',
  'narrative_theme',
  'subject',
  'topic',
  'subtopic',
];

// Default hex colors for each level (used when custom colors are not set)
export const DEFAULT_LEVEL_COLORS_HEX: Record<TaxonomyLevel, LevelColorConfig> = {
  pillar: {
    bg: '#FAF5FF',      // purple-50
    border: '#C084FC',  // purple-400
    dot: '#A855F7',     // purple-500
  },
  narrative_theme: {
    bg: '#EFF6FF',      // blue-50
    border: '#60A5FA',  // blue-400
    dot: '#3B82F6',     // blue-500
  },
  subject: {
    bg: '#F0FDF4',      // green-50
    border: '#4ADE80',  // green-400
    dot: '#22C55E',     // green-500
  },
  topic: {
    bg: '#FEFCE8',      // yellow-50
    border: '#FACC15',  // yellow-400
    dot: '#EAB308',     // yellow-500
  },
  subtopic: {
    bg: '#FFF7ED',      // orange-50
    border: '#FB923C',  // orange-400
    dot: '#F97316',     // orange-500
  },
};

export function getChildLevel(parentLevel: TaxonomyLevel | null): TaxonomyLevel | null {
  if (parentLevel === null) return 'pillar';
  return LEVEL_CHILDREN[parentLevel];
}

export function getParentLevel(level: TaxonomyLevel): TaxonomyLevel | null {
  return LEVEL_HIERARCHY[level];
}

export function getLevelDepth(level: TaxonomyLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

// Default color palettes for audience and geography pills
export const DEFAULT_AUDIENCE_COLORS: PillColorConfig[] = [
  { bg: '#DBEAFE', text: '#1E40AF' }, // blue
  { bg: '#E0E7FF', text: '#3730A3' }, // indigo
  { bg: '#EDE9FE', text: '#5B21B6' }, // violet
  { bg: '#FCE7F3', text: '#9D174D' }, // pink
  { bg: '#FEE2E2', text: '#991B1B' }, // red
  { bg: '#FFEDD5', text: '#9A3412' }, // orange
  { bg: '#FEF3C7', text: '#92400E' }, // amber
  { bg: '#ECFCCB', text: '#3F6212' }, // lime
];

export const DEFAULT_GEOGRAPHY_COLORS: PillColorConfig[] = [
  { bg: '#D1FAE5', text: '#065F46' }, // emerald
  { bg: '#CCFBF1', text: '#0F766E' }, // teal
  { bg: '#CFFAFE', text: '#0E7490' }, // cyan
  { bg: '#E0F2FE', text: '#0369A1' }, // sky
  { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
  { bg: '#F3E8FF', text: '#7C3AED' }, // purple
  { bg: '#FAE8FF', text: '#A21CAF' }, // fuchsia
  { bg: '#FDF4FF', text: '#86198F' }, // pink
];

// Get default color for a pill based on its index
export function getDefaultAudienceColor(index: number): PillColorConfig {
  return DEFAULT_AUDIENCE_COLORS[index % DEFAULT_AUDIENCE_COLORS.length];
}

export function getDefaultGeographyColor(index: number): PillColorConfig {
  return DEFAULT_GEOGRAPHY_COLORS[index % DEFAULT_GEOGRAPHY_COLORS.length];
}
