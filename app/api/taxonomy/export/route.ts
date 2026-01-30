import { NextRequest, NextResponse } from 'next/server';
import { getAllNodes } from '@/lib/storage';
import { buildTree, getNodePath } from '@/lib/tree-utils';
import { TaxonomyNode } from '@/types/taxonomy';
import { LEVEL_LABELS } from '@/config/levels';

// GET /api/taxonomy/export?format=json|csv
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    const nodes = await getAllNodes();

    if (format === 'csv') {
      const csv = nodesToCSV(nodes);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="taxonomy.csv"',
        },
      });
    }

    // Default to JSON
    const tree = buildTree(nodes);
    return new NextResponse(JSON.stringify({ taxonomy: tree }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="taxonomy.json"',
      },
    });
  } catch (error) {
    console.error('Error exporting taxonomy:', error);
    return NextResponse.json(
      { error: 'Failed to export taxonomy' },
      { status: 500 }
    );
  }
}

function nodesToCSV(nodes: TaxonomyNode[]): string {
  // Headers include hierarchy columns and all data fields
  const headers = [
    'ID',
    'Name',
    'Level',
    'Pillar',
    'Narrative Theme',
    'Subject',
    'Topic',
    'Subtopic',
    'Objective',
    'Description',
    'Notes',
    'Audiences',
    'Geographies',
    'Created',
    'Updated',
  ];

  const rows = nodes.map((node) => {
    const path = getNodePath(nodes, node.id);
    const pathByLevel: Record<string, string> = {};

    // Build the hierarchy path
    path.forEach((n) => {
      pathByLevel[n.level] = n.name;
    });

    return [
      node.id,
      escapeCSV(node.name),
      LEVEL_LABELS[node.level],
      escapeCSV(pathByLevel['pillar'] || ''),
      escapeCSV(pathByLevel['narrative_theme'] || ''),
      escapeCSV(pathByLevel['subject'] || ''),
      escapeCSV(pathByLevel['topic'] || ''),
      escapeCSV(pathByLevel['subtopic'] || ''),
      escapeCSV(node.objective || ''),
      escapeCSV(node.description || ''),
      escapeCSV(node.notes || ''),
      escapeCSV((node.audiences || []).join('; ')),
      escapeCSV((node.geographies || []).join('; ')),
      node.createdAt,
      node.updatedAt,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
