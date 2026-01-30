import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getNodeById, updateNode, deleteNode } from '@/lib/storage';

const UpdateNodeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  objective: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  audiences: z.array(z.string()).optional(),
  geographies: z.array(z.string()).optional(),
});

// GET /api/taxonomy/[id] - Get a single node
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const node = await getNodeById(id);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({ node });
  } catch (error) {
    console.error('Error fetching node:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node' },
      { status: 500 }
    );
  }
}

// PUT /api/taxonomy/[id] - Update a node
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateNodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateNode(id, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({ node: updated });
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

// DELETE /api/taxonomy/[id] - Delete a node and all descendants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const node = await getNodeById(id);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const deletedIds = await deleteNode(id);

    return NextResponse.json({
      message: 'Node and descendants deleted',
      deleted: deletedIds,
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
