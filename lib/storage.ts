import { promises as fs } from 'fs';
import path from 'path';
import { TaxonomyData, TaxonomyNode, TaxonomySettings } from '@/types/taxonomy';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'taxonomy.json');

const DEFAULT_SETTINGS: TaxonomySettings = {
  availableAudiences: [
    'Internal Employees',
    'Executives',
    'Investors',
    'Media',
    'Customers',
    'Partners',
    'Government',
    'General Public',
  ],
  availableGeographies: [
    'Global',
    'North America',
    'Europe',
    'Asia Pacific',
    'Latin America',
    'Middle East & Africa',
  ],
};

const DEFAULT_DATA: TaxonomyData = {
  metadata: {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
  },
  settings: DEFAULT_SETTINGS,
  nodes: [],
};

export async function readTaxonomyData(): Promise<TaxonomyData> {
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent) as TaxonomyData;

    // Migration: Add settings if they don't exist (for existing data files)
    if (!data.settings) {
      data.settings = DEFAULT_SETTINGS;
      await writeTaxonomyData(data);
    }

    return data;
  } catch (error) {
    // If file doesn't exist, return default data
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeTaxonomyData(DEFAULT_DATA);
      return DEFAULT_DATA;
    }
    throw error;
  }
}

export async function writeTaxonomyData(data: TaxonomyData): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(DATA_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });

  // Update metadata
  data.metadata.lastModified = new Date().toISOString();

  // Write atomically using a temp file
  const tempPath = `${DATA_FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, DATA_FILE_PATH);
}

export async function getAllNodes(): Promise<TaxonomyNode[]> {
  const data = await readTaxonomyData();
  return data.nodes;
}

export async function getNodeById(id: string): Promise<TaxonomyNode | null> {
  const data = await readTaxonomyData();
  return data.nodes.find((n) => n.id === id) || null;
}

export async function createNode(node: TaxonomyNode): Promise<TaxonomyNode> {
  const data = await readTaxonomyData();
  data.nodes.push(node);
  await writeTaxonomyData(data);
  return node;
}

export async function updateNode(
  id: string,
  updates: Partial<TaxonomyNode>
): Promise<TaxonomyNode | null> {
  const data = await readTaxonomyData();
  const index = data.nodes.findIndex((n) => n.id === id);

  if (index === -1) return null;

  data.nodes[index] = {
    ...data.nodes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeTaxonomyData(data);
  return data.nodes[index];
}

export async function deleteNode(id: string): Promise<string[]> {
  const data = await readTaxonomyData();

  // Get all descendant IDs
  const getDescendants = (nodeId: string): string[] => {
    const children = data.nodes.filter((n) => n.parentId === nodeId);
    return children.flatMap((child) => [child.id, ...getDescendants(child.id)]);
  };

  const idsToDelete = [id, ...getDescendants(id)];

  data.nodes = data.nodes.filter((n) => !idsToDelete.includes(n.id));
  await writeTaxonomyData(data);

  return idsToDelete;
}

export async function reorderNodes(
  nodeId: string,
  newParentId: string | null | undefined,
  newOrder: number
): Promise<TaxonomyNode[]> {
  const data = await readTaxonomyData();
  const node = data.nodes.find((n) => n.id === nodeId);

  if (!node) throw new Error('Node not found');

  // If changing parent, update parentId and level
  if (newParentId !== undefined && newParentId !== node.parentId) {
    node.parentId = newParentId;
    // Note: Level should be recalculated based on new parent
  }

  // Update order
  node.order = newOrder;
  node.updatedAt = new Date().toISOString();

  // Re-index siblings
  const siblings = data.nodes
    .filter((n) => n.parentId === node.parentId && n.id !== nodeId)
    .sort((a, b) => a.order - b.order);

  siblings.splice(newOrder, 0, node);
  siblings.forEach((s, i) => {
    s.order = i;
  });

  await writeTaxonomyData(data);
  return data.nodes;
}

// Settings functions
export async function getSettings(): Promise<TaxonomySettings> {
  const data = await readTaxonomyData();
  return data.settings;
}

export async function updateSettings(
  settings: Partial<TaxonomySettings>
): Promise<TaxonomySettings> {
  const data = await readTaxonomyData();
  data.settings = {
    ...data.settings,
    ...settings,
  };
  await writeTaxonomyData(data);
  return data.settings;
}
