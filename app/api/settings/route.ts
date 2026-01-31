import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, updateSettings } from '@/lib/storage';

const LevelColorConfigSchema = z.object({
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  dot: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const LevelColorsSchema = z.object({
  pillar: LevelColorConfigSchema,
  narrative_theme: LevelColorConfigSchema,
  subject: LevelColorConfigSchema,
  topic: LevelColorConfigSchema,
  subtopic: LevelColorConfigSchema,
});

const UpdateSettingsSchema = z.object({
  availableAudiences: z.array(z.string().min(1).max(100)).optional(),
  availableGeographies: z.array(z.string().min(1).max(100)).optional(),
  levelColors: LevelColorsSchema.optional(),
});

// GET /api/settings - Get current settings
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateSettings(parsed.data);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
