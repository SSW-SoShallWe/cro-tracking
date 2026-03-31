import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from './db';

export const eventSchema = z.object({
  event_name: z.enum(['variant_view', 'cta_click', 'form_submit']),
  test_id: z.string().min(1).max(100),
  landing_id: z.string().min(1).max(100),
  variant_id: z.string().min(1).max(50),
  session_id: z.string().min(1).max(64),
  timestamp: z.string().datetime(),
  cta_id: z.string().max(100).optional(),
  form_id: z.string().max(100).optional(),
  page_url: z.string().url().max(2000).optional(),
});

export const eventsRouter = Router();

eventsRouter.post('/events', async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  const e = parsed.data;

  try {
    await pool.query(
      `INSERT INTO ab_events (event_name, test_id, landing_id, variant_id, session_id, cta_id, form_id, page_url, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [e.event_name, e.test_id, e.landing_id, e.variant_id, e.session_id, e.cta_id || null, e.form_id || null, e.page_url || null, JSON.stringify(e)]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error inserting event:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
