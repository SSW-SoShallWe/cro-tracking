// server/src/__tests__/events.test.ts
import { describe, it, expect } from 'vitest';
import { eventSchema } from '../events';

describe('eventSchema', () => {
  const validPayload = {
    event_name: 'variant_view',
    test_id: 'headline_april_01',
    landing_id: 'mortgage_lp_01',
    variant_id: 'A',
    session_id: 'abc123def456',
    timestamp: '2026-03-31T12:00:00Z',
  };

  it('accepts a valid variant_view event', () => {
    const result = eventSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts valid event with optional fields', () => {
    const result = eventSchema.safeParse({
      ...validPayload,
      event_name: 'cta_click',
      cta_id: 'hero_cta',
      page_url: 'https://example.com/lp',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid event_name', () => {
    const result = eventSchema.safeParse({
      ...validPayload,
      event_name: 'page_view',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { test_id, ...incomplete } = validPayload;
    const result = eventSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects overly long test_id', () => {
    const result = eventSchema.safeParse({
      ...validPayload,
      test_id: 'x'.repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
