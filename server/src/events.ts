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
  const ip = req.ip || null;
  const userAgent = req.headers['user-agent']?.slice(0, 1000) || null;

  try {
    await pool.query(
      `INSERT INTO cro_tracking.ab_events (event_name, test_id, landing_id, variant_id, session_id, cta_id, form_id, page_url, raw_payload, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (session_id, test_id) WHERE event_name = 'variant_view'
       DO UPDATE SET variant_id = EXCLUDED.variant_id, landing_id = EXCLUDED.landing_id, page_url = EXCLUDED.page_url, raw_payload = EXCLUDED.raw_payload, ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent, created_at = now()`,
      [e.event_name, e.test_id, e.landing_id, e.variant_id, e.session_id, e.cta_id || null, e.form_id || null, e.page_url || null, JSON.stringify(e), ip, userAgent]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error inserting event:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
