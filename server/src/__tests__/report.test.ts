// server/src/__tests__/report.test.ts
import { describe, it, expect } from 'vitest';
import { buildReportQuery } from '../report';

describe('buildReportQuery', () => {
  it('returns parameterized SQL and params', () => {
    const { sql, params } = buildReportQuery('headline_april_01');
    expect(params).toEqual(['headline_april_01']);
    expect(sql).toContain('COUNT(DISTINCT session_id)');
    expect(sql).toContain('$1');
    expect(sql).not.toContain('created_at >=');
    expect(sql).not.toContain('created_at <=');
  });

  it('adds created_at >= filter when from is provided', () => {
    const { sql, params } = buildReportQuery('t1', { from: '2026-04-01T00:00:00Z' });
    expect(params).toEqual(['t1', '2026-04-01T00:00:00Z']);
    expect(sql).toContain('created_at >= $2');
    expect(sql).not.toContain('created_at <=');
  });

  it('adds created_at <= filter when to is provided', () => {
    const { sql, params } = buildReportQuery('t1', { to: '2026-04-16T23:59:59Z' });
    expect(params).toEqual(['t1', '2026-04-16T23:59:59Z']);
    expect(sql).toContain('created_at <= $2');
    expect(sql).not.toContain('created_at >=');
  });

  it('adds both filters when from and to are provided', () => {
    const { sql, params } = buildReportQuery('t1', {
      from: '2026-04-01T00:00:00Z',
      to: '2026-04-16T23:59:59Z',
    });
    expect(params).toEqual(['t1', '2026-04-01T00:00:00Z', '2026-04-16T23:59:59Z']);
    expect(sql).toContain('created_at >= $2');
    expect(sql).toContain('created_at <= $3');
  });
});
