import { promises as fs } from 'fs';
import path from 'path';
import { TaxonomyData, TaxonomyNode, TaxonomySettings } from '@/types/taxonomy';
import {
  initializeDatabase,
  getAllNodesFromDb,
  getNodeByIdFromDb,
  createNodeInDb,
  updateNodeInDb,
  deleteNodeFromDb,
  getSettingsFromDb,
  updateSettingsInDb,
} from './db';

// Check if we should use database
const useDatabase = !!process.env.DATABASE_URL;

// File-based storage paths (fallback for local dev without database)
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const DATA_FILE_PATH = path.join(DATA_DIR, 'taxonomy.json');
const SOURCE_FILE_PATH = path.join(process.cwd(), 'data', 'taxonomy.json');

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

// Initialize database on first use
let dbInitialized = false;
async function ensureDbInitialized(): Promise<void> {
  if (!dbInitialized && useDatabase) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// File-based storage functions
async function readTaxonomyDataFromFile(): Promise<TaxonomyData> {
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent) as TaxonomyData;

    if (!data.settings) {
      data.settings = DEFAULT_SETTINGS;
      await writeTaxonomyDataToFile(data);
    }

    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (isVercel) {
        try {
          const sourceContent = await fs.readFile(SOURCE_FILE_PATH, 'utf-8');
          await fs.mkdir(DATA_DIR, { recursive: true });
          await fs.writeFile(DATA_FILE_PATH, sourceContent, 'utf-8');
          return JSON.parse(sourceContent) as TaxonomyData;
        } catch {
          await writeTaxonomyDataToFile(DEFAULT_DATA);
          return DEFAULT_DATA;
        }
      }
      await writeTaxonomyDataToFile(DEFAULT_DATA);
      return DEFAULT_DATA;
    }
    throw error;
  }
}

async function writeTaxonomyDataToFile(data: TaxonomyData): Promise<void> {
  const dir = path.dirname(DATA_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  data.metadata.lastModified = new Date().toISOString();
  const tempPath = `${DATA_FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, DATA_FILE_PATH);
}

// Unified storage interface
export async function getAllNodes(): Promise<TaxonomyNode[]> {
  if (useDatabase) {
    await ensureDbInitialized();
    return getAllNodesFromDb();
  }
  const data = await readTaxonomyDataFromFile();
  return data.nodes;
}

export async function getNodeById(id: string): Promise<TaxonomyNode | null> {
  if (useDatabase) {
    await ensureDbInitialized();
    return getNodeByIdFromDb(id);
  }
  const data = await readTaxonomyDataFromFile();
  return data.nodes.find((n) => n.id === id) || null;
}

export async function createNode(node: TaxonomyNode): Promise<TaxonomyNode> {
  if (useDatabase) {
    await ensureDbInitialized();
    return createNodeInDb(node);
  }
  const data = await readTaxonomyDataFromFile();
  data.nodes.push(node);
  await writeTaxonomyDataToFile(data);
  return node;
}

export async function updateNode(
  id: string,
  updates: Partial<TaxonomyNode>
): Promise<TaxonomyNode | null> {
  if (useDatabase) {
    await ensureDbInitialized();
    return updateNodeInDb(id, updates);
  }
  const data = await readTaxonomyDataFromFile();
  const index = data.nodes.findIndex((n) => n.id === id);

  if (index === -1) return null;

  data.nodes[index] = {
    ...data.nodes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeTaxonomyDataToFile(data);
  return data.nodes[index];
}

export async function deleteNode(id: string): Promise<string[]> {
  if (useDatabase) {
    await ensureDbInitialized();
    return deleteNodeFromDb(id);
  }
  const data = await readTaxonomyDataFromFile();

  const getDescendants = (nodeId: string): string[] => {
    const children = data.nodes.filter((n) => n.parentId === nodeId);
    return children.flatMap((child) => [child.id, ...getDescendants(child.id)]);
  };

  const idsToDelete = [id, ...getDescendants(id)];
  data.nodes = data.nodes.filter((n) => !idsToDelete.includes(n.id));
  await writeTaxonomyDataToFile(data);

  return idsToDelete;
}

export async function reorderNodes(
  nodeId: string,
  newParentId: string | null | undefined,
  newOrder: number
): Promise<TaxonomyNode[]> {
  // For now, keep file-based implementation (can be added to DB later)
  const data = await readTaxonomyDataFromFile();
  const node = data.nodes.find((n) => n.id === nodeId);

  if (!node) throw new Error('Node not found');

  if (newParentId !== undefined && newParentId !== node.parentId) {
    node.parentId = newParentId;
  }

  node.order = newOrder;
  node.updatedAt = new Date().toISOString();

  const siblings = data.nodes
    .filter((n) => n.parentId === node.parentId && n.id !== nodeId)
    .sort((a, b) => a.order - b.order);

  siblings.splice(newOrder, 0, node);
  siblings.forEach((s, i) => {
    s.order = i;
  });

  await writeTaxonomyDataToFile(data);
  return data.nodes;
}

// Settings functions
export async function getSettings(): Promise<TaxonomySettings> {
  if (useDatabase) {
    await ensureDbInitialized();
    return getSettingsFromDb();
  }
  const data = await readTaxonomyDataFromFile();
  return data.settings;
}

export async function updateSettings(
  settings: Partial<TaxonomySettings>
): Promise<TaxonomySettings> {
  if (useDatabase) {
    await ensureDbInitialized();
    return updateSettingsInDb(settings);
  }
  const data = await readTaxonomyDataFromFile();
  data.settings = {
    ...data.settings,
    ...settings,
  };
  await writeTaxonomyDataToFile(data);
  return data.settings;
}

// Legacy exports for compatibility
export async function readTaxonomyData(): Promise<TaxonomyData> {
  const nodes = await getAllNodes();
  const settings = await getSettings();
  return {
    metadata: {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
    },
    settings,
    nodes,
  };
}

export async function writeTaxonomyData(data: TaxonomyData): Promise<void> {
  await writeTaxonomyDataToFile(data);
}
