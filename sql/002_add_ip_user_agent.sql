ALTER TABLE cro_tracking.ab_events
  ADD COLUMN IF NOT EXISTS ip         INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_events_ip_ua
  ON cro_tracking.ab_events (ip, user_agent, test_id)
  WHERE event_name = 'variant_view';
