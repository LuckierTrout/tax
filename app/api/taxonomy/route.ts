import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getAllNodes, createNode, readTaxonomyData } from '@/lib/storage';
import { getChildLevel, LEVEL_HIERARCHY } from '@/config/levels';
import { TaxonomyLevel, TaxonomyNode } from '@/types/taxonomy';

const CreateNodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  parentId: z.string().nullable(),
});

// GET /api/taxonomy - Get all nodes
export async function GET() {
  try {
    const nodes = await getAllNodes();
    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch taxonomy' },
      { status: 500 }
    );
  }
}

// POST /api/taxonomy - Create a new node
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, objective, notes, parentId } = parsed.data;

    // Determine level based on parent
    let level: TaxonomyLevel;
    let order: number;

    if (parentId === null) {
      level = 'pillar';
      const data = await readTaxonomyData();
      const pillars = data.nodes.filter((n) => n.level === 'pillar');
      order = pillars.length;
    } else {
      const data = await readTaxonomyData();
      const parent = data.nodes.find((n) => n.id === parentId);

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent node not found' },
          { status: 404 }
        );
      }

      const childLevel = getChildLevel(parent.level);
      if (!childLevel) {
        return NextResponse.json(
          { error: 'Cannot add children to subtopics' },
          { status: 400 }
        );
      }

      level = childLevel;
      const siblings = data.nodes.filter((n) => n.parentId === parentId);
      order = siblings.length;
    }

    const now = new Date().toISOString();
    const newNode: TaxonomyNode = {
      id: nanoid(10),
      name,
      description,
      objective,
      notes,
      parentId,
      level,
      order,
      createdAt: now,
      updatedAt: now,
    };

    const created = await createNode(newNode);
    return NextResponse.json({ node: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
}
