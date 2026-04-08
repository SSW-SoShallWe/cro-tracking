import { Router, Request, Response } from 'express';
import { pool } from './db';
import { TestReport } from './types';

export function buildReportQuery(testId: string) {
  const sql = `
    SELECT
      variant_id,
      COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'variant_view')  AS views,
      COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'cta_click')     AS clicks,
      COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'form_submit')   AS submits
    FROM cro_tracking.ab_events
    WHERE test_id = $1
    GROUP BY variant_id
    ORDER BY variant_id
  `;
  return { sql, params: [testId] };
}

export const reportRouter = Router();

reportRouter.get('/tests/:testId/report', async (req: Request, res: Response) => {
  const { testId } = req.params;

  if (!testId || testId.length > 100) {
    res.status(400).json({ error: 'Invalid test_id' });
    return;
  }

  try {
    const { sql, params } = buildReportQuery(testId);
    const result = await pool.query(sql, params);

    const variants = result.rows.map(row => {
      const views = parseInt(row.views, 10);
      const clicks = parseInt(row.clicks, 10);
      const submits = parseInt(row.submits, 10);
      return {
        variant_id: row.variant_id,
        views,
        clicks,
        submits,
        ctr: views > 0 ? Math.round((clicks / views) * 10000) / 10000 : 0,
        submit_rate: views > 0 ? Math.round((submits / views) * 10000) / 10000 : 0,
      };
    });

    const report: TestReport = {
      test_id: testId,
      variants,
      generated_at: new Date().toISOString(),
    };

    res.json(report);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
