CREATE TABLE IF NOT EXISTS ab_events (
  id            BIGSERIAL PRIMARY KEY,
  event_name    VARCHAR(20)  NOT NULL CHECK (event_name IN ('variant_view', 'cta_click', 'form_submit')),
  test_id       VARCHAR(100) NOT NULL,
  landing_id    VARCHAR(100) NOT NULL,
  variant_id    VARCHAR(50)  NOT NULL,
  session_id    VARCHAR(64)  NOT NULL,
  cta_id        VARCHAR(100),
  form_id       VARCHAR(100),
  page_url      TEXT,
  raw_payload   JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Prevent duplicate variant_view per session+test+variant
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_view
  ON ab_events (session_id, test_id, variant_id)
  WHERE event_name = 'variant_view';

-- Reporting indexes
CREATE INDEX IF NOT EXISTS idx_events_test_id    ON ab_events (test_id);
CREATE INDEX IF NOT EXISTS idx_events_variant_id ON ab_events (variant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON ab_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON ab_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_test_event ON ab_events (test_id, event_name);
