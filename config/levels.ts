import { TaxonomyLevel } from '@/types/taxonomy';

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
