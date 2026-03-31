// server/src/__tests__/report.test.ts
import { describe, it, expect } from 'vitest';
import { buildReportQuery } from '../report';

describe('buildReportQuery', () => {
  it('returns parameterized SQL and params', () => {
    const { sql, params } = buildReportQuery('headline_april_01');
    expect(params).toEqual(['headline_april_01']);
    expect(sql).toContain('COUNT(DISTINCT session_id)');
    expect(sql).toContain('$1');
  });
});
