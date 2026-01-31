'use server';

import { neon } from '@neondatabase/serverless';
import { TaxonomyData, TaxonomyNode, TaxonomySettings } from '@/types/taxonomy';

// Get database connection
function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}

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

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const sql = getDb();

  // Create nodes table
  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_nodes (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      objective TEXT,
      notes TEXT,
      audiences TEXT[],
      geographies TEXT[],
      parent_id VARCHAR(20) REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
      level VARCHAR(50) NOT NULL,
      node_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Create settings table
  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      available_audiences TEXT[] NOT NULL,
      available_geographies TEXT[] NOT NULL,
      level_colors JSONB,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT single_row CHECK (id = 1)
    )
  `;

  // Add level_colors column if it doesn't exist (for existing databases)
  await sql`
    ALTER TABLE taxonomy_settings
    ADD COLUMN IF NOT EXISTS level_colors JSONB
  `;

  // Add audience_colors column if it doesn't exist
  await sql`
    ALTER TABLE taxonomy_settings
    ADD COLUMN IF NOT EXISTS audience_colors JSONB
  `;

  // Add geography_colors column if it doesn't exist
  await sql`
    ALTER TABLE taxonomy_settings
    ADD COLUMN IF NOT EXISTS geography_colors JSONB
  `;

  // Insert default settings if not exists
  await sql`
    INSERT INTO taxonomy_settings (id, available_audiences, available_geographies)
    VALUES (1, ${DEFAULT_SETTINGS.availableAudiences}, ${DEFAULT_SETTINGS.availableGeographies})
    ON CONFLICT (id) DO NOTHING
  `;
}

// Node operations
export async function getAllNodesFromDb(): Promise<TaxonomyNode[]> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      id,
      name,
      description,
      objective,
      notes,
      audiences,
      geographies,
      parent_id as "parentId",
      level,
      node_order as "order",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM taxonomy_nodes
    ORDER BY node_order ASC
  `;

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    objective: row.objective || undefined,
    notes: row.notes || undefined,
    audiences: row.audiences || [],
    geographies: row.geographies || [],
    parentId: row.parentId,
    level: row.level,
    order: row.order,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  })) as TaxonomyNode[];
}

export async function getNodeByIdFromDb(id: string): Promise<TaxonomyNode | null> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      id,
      name,
      description,
      objective,
      notes,
      audiences,
      geographies,
      parent_id as "parentId",
      level,
      node_order as "order",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM taxonomy_nodes
    WHERE id = ${id}
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    objective: row.objective || undefined,
    notes: row.notes || undefined,
    audiences: row.audiences || [],
    geographies: row.geographies || [],
    parentId: row.parentId,
    level: row.level,
    order: row.order,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  } as TaxonomyNode;
}

export async function createNodeInDb(node: TaxonomyNode): Promise<TaxonomyNode> {
  const sql = getDb();

  await sql`
    INSERT INTO taxonomy_nodes (
      id, name, description, objective, notes,
      audiences, geographies, parent_id, level, node_order,
      created_at, updated_at
    ) VALUES (
      ${node.id},
      ${node.name},
      ${node.description || null},
      ${node.objective || null},
      ${node.notes || null},
      ${node.audiences || []},
      ${node.geographies || []},
      ${node.parentId},
      ${node.level},
      ${node.order},
      ${node.createdAt},
      ${node.updatedAt}
    )
  `;

  return node;
}

export async function updateNodeInDb(
  id: string,
  updates: Partial<TaxonomyNode>
): Promise<TaxonomyNode | null> {
  const sql = getDb();

  // Build dynamic update
  const updatedAt = new Date().toISOString();

  const rows = await sql`
    UPDATE taxonomy_nodes SET
      name = COALESCE(${updates.name ?? null}, name),
      description = COALESCE(${updates.description ?? null}, description),
      objective = COALESCE(${updates.objective ?? null}, objective),
      notes = COALESCE(${updates.notes ?? null}, notes),
      audiences = COALESCE(${updates.audiences ?? null}, audiences),
      geographies = COALESCE(${updates.geographies ?? null}, geographies),
      updated_at = ${updatedAt}
    WHERE id = ${id}
    RETURNING
      id,
      name,
      description,
      objective,
      notes,
      audiences,
      geographies,
      parent_id as "parentId",
      level,
      node_order as "order",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    objective: row.objective || undefined,
    notes: row.notes || undefined,
    audiences: row.audiences || [],
    geographies: row.geographies || [],
    parentId: row.parentId,
    level: row.level,
    order: row.order,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  } as TaxonomyNode;
}

export async function deleteNodeFromDb(id: string): Promise<string[]> {
  const sql = getDb();

  // Get all descendant IDs using recursive CTE
  const descendants = await sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM taxonomy_nodes WHERE id = ${id}
      UNION ALL
      SELECT n.id FROM taxonomy_nodes n
      INNER JOIN descendants d ON n.parent_id = d.id
    )
    SELECT id FROM descendants
  `;

  const idsToDelete = descendants.map(row => row.id);

  // Delete all (CASCADE will handle children, but we do it explicitly for the return value)
  await sql`
    DELETE FROM taxonomy_nodes WHERE id = ANY(${idsToDelete})
  `;

  return idsToDelete;
}

// Settings operations
export async function getSettingsFromDb(): Promise<TaxonomySettings> {
  const sql = getDb();

  const rows = await sql`
    SELECT available_audiences, available_geographies, level_colors, audience_colors, geography_colors
    FROM taxonomy_settings
    WHERE id = 1
  `;

  if (rows.length === 0) {
    return DEFAULT_SETTINGS;
  }

  return {
    availableAudiences: rows[0].available_audiences || DEFAULT_SETTINGS.availableAudiences,
    availableGeographies: rows[0].available_geographies || DEFAULT_SETTINGS.availableGeographies,
    levelColors: rows[0].level_colors || undefined,
    audienceColors: rows[0].audience_colors || undefined,
    geographyColors: rows[0].geography_colors || undefined,
  };
}

export async function updateSettingsInDb(
  settings: Partial<TaxonomySettings>
): Promise<TaxonomySettings> {
  const sql = getDb();

  const levelColorsJson = settings.levelColors ? JSON.stringify(settings.levelColors) : null;
  const audienceColorsJson = settings.audienceColors ? JSON.stringify(settings.audienceColors) : null;
  const geographyColorsJson = settings.geographyColors ? JSON.stringify(settings.geographyColors) : null;

  const rows = await sql`
    UPDATE taxonomy_settings SET
      available_audiences = COALESCE(${settings.availableAudiences ?? null}, available_audiences),
      available_geographies = COALESCE(${settings.availableGeographies ?? null}, available_geographies),
      level_colors = COALESCE(${levelColorsJson}::jsonb, level_colors),
      audience_colors = COALESCE(${audienceColorsJson}::jsonb, audience_colors),
      geography_colors = COALESCE(${geographyColorsJson}::jsonb, geography_colors),
      updated_at = NOW()
    WHERE id = 1
    RETURNING available_audiences, available_geographies, level_colors, audience_colors, geography_colors
  `;

  if (rows.length === 0) {
    return DEFAULT_SETTINGS;
  }

  return {
    availableAudiences: rows[0].available_audiences,
    availableGeographies: rows[0].available_geographies,
    levelColors: rows[0].level_colors || undefined,
    audienceColors: rows[0].audience_colors || undefined,
    geographyColors: rows[0].geography_colors || undefined,
  };
}
