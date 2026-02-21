import { Hono } from 'hono';
import { db } from '../../lib/db';

const branding = new Hono();

interface BrandingRow {
  app_name: string;
  logo_url: string;
  primary_color: string;
  font_preset: string;
  updated_at: number;
}

const VALID_FONT_PRESETS = ['dm-sans', 'inter', 'space-grotesk', 'plus-jakarta', 'sora'];

// GET /branding — public, all users need this
branding.get('/', (c) => {
  const row = db.query('SELECT * FROM branding WHERE id = 1').get() as BrandingRow | null;

  if (!row) {
    return c.json({
      appName: 'Amanah',
      logoUrl: '/logo.png',
      primaryColor: '#C9A96E',
      fontPreset: 'dm-sans',
    });
  }

  return c.json({
    appName: row.app_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    fontPreset: row.font_preset,
  });
});

// PUT /branding — admin only (client-side guard via useIsAdmin)
branding.put('/', async (c) => {
  try {
    const body = await c.req.json<{
      appName?: string;
      logoUrl?: string;
      primaryColor?: string;
      fontPreset?: string;
    }>();

    if (body.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(body.primaryColor)) {
      return c.json({ error: 'Invalid color format. Must be #RRGGBB' }, 400);
    }

    if (body.fontPreset && !VALID_FONT_PRESETS.includes(body.fontPreset)) {
      return c.json({ error: `Invalid font preset. Must be one of: ${VALID_FONT_PRESETS.join(', ')}` }, 400);
    }

    if (body.logoUrl !== undefined && body.logoUrl.trim() === '') {
      return c.json({ error: 'Logo URL cannot be empty' }, 400);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.appName !== undefined) { updates.push('app_name = ?'); values.push(body.appName); }
    if (body.logoUrl !== undefined) { updates.push('logo_url = ?'); values.push(body.logoUrl); }
    if (body.primaryColor !== undefined) { updates.push('primary_color = ?'); values.push(body.primaryColor); }
    if (body.fontPreset !== undefined) { updates.push('font_preset = ?'); values.push(body.fontPreset); }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));

    db.run(`UPDATE branding SET ${updates.join(', ')} WHERE id = 1`, values);

    const row = db.query('SELECT * FROM branding WHERE id = 1').get() as BrandingRow;
    return c.json({
      appName: row.app_name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      fontPreset: row.font_preset,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default branding;
