/**
 * Migration script to move data from JSON file to Neon database
 *
 * Usage:
 *   npx tsx scripts/migrate-to-db.ts
 *
 * Requires DATABASE_URL environment variable to be set
 */

import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'fs';
import path from 'path';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.log('\nSet it with:');
    console.log('  export DATABASE_URL="postgres://user:pass@host/db?sslmode=require"');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('🚀 Starting migration to Neon database...\n');

  // Create tables
  console.log('📦 Creating tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_nodes (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      objective TEXT,
      notes TEXT,
      audiences TEXT[],
      geographies TEXT[],
      parent_id VARCHAR(20),
      level VARCHAR(50) NOT NULL,
      node_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      available_audiences TEXT[] NOT NULL,
      available_geographies TEXT[] NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT single_row CHECK (id = 1)
    )
  `;

  console.log('✅ Tables created\n');

  // Read existing data from JSON file
  const dataFilePath = path.join(process.cwd(), 'data', 'taxonomy.json');

  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Migrate settings
    console.log('⚙️  Migrating settings...');
    if (data.settings) {
      await sql`
        INSERT INTO taxonomy_settings (id, available_audiences, available_geographies)
        VALUES (1, ${data.settings.availableAudiences || []}, ${data.settings.availableGeographies || []})
        ON CONFLICT (id) DO UPDATE SET
          available_audiences = ${data.settings.availableAudiences || []},
          available_geographies = ${data.settings.availableGeographies || []},
          updated_at = NOW()
      `;
      console.log('✅ Settings migrated\n');
    }

    // Migrate nodes (need to handle parent_id foreign key)
    console.log('📄 Migrating nodes...');

    if (data.nodes && data.nodes.length > 0) {
      // First, clear existing nodes
      await sql`DELETE FROM taxonomy_nodes`;

      // Sort nodes by level to insert parents before children
      const levelOrder = ['pillar', 'narrative_theme', 'subject', 'topic', 'subtopic'];
      const sortedNodes = [...data.nodes].sort((a, b) => {
        return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
      });

      for (const node of sortedNodes) {
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
            ${node.parentId || null},
            ${node.level},
            ${node.order || 0},
            ${node.createdAt || new Date().toISOString()},
            ${node.updatedAt || new Date().toISOString()}
          )
        `;
        console.log(`  ✓ Migrated: ${node.name} (${node.level})`);
      }

      console.log(`\n✅ Migrated ${data.nodes.length} nodes\n`);
    } else {
      console.log('ℹ️  No nodes to migrate\n');
    }

    // Add foreign key constraint after data is inserted
    console.log('🔗 Adding foreign key constraint...');
    try {
      await sql`
        ALTER TABLE taxonomy_nodes
        ADD CONSTRAINT fk_parent
        FOREIGN KEY (parent_id) REFERENCES taxonomy_nodes(id) ON DELETE CASCADE
      `;
      console.log('✅ Foreign key added\n');
    } catch {
      console.log('ℹ️  Foreign key already exists\n');
    }

    console.log('🎉 Migration complete!');
    console.log('\nYour data is now in the Neon database.');
    console.log('Deploy to Vercel to use it in production.');

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('ℹ️  No existing data file found. Empty database created.');
      console.log('   Settings initialized with defaults.');

      // Insert default settings
      await sql`
        INSERT INTO taxonomy_settings (id, available_audiences, available_geographies)
        VALUES (1,
          ARRAY['Internal Employees', 'Executives', 'Investors', 'Media', 'Customers', 'Partners', 'Government', 'General Public'],
          ARRAY['Global', 'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa']
        )
        ON CONFLICT (id) DO NOTHING
      `;

      console.log('\n🎉 Database initialized!');
    } else {
      throw error;
    }
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
