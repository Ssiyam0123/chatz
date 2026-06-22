-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';

-- Create report target type enum
DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('post', 'comment', 'story', 'message', 'group', 'user', 'media');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create report status enum
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'in_review', 'dismissed', 'action_taken', 'escalated', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create report priority enum
DO $$ BEGIN
  CREATE TYPE report_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   report_target_type NOT NULL,
  target_id     UUID NOT NULL,
  reason        VARCHAR(255) NOT NULL,
  details       TEXT,
  status        report_status NOT NULL DEFAULT 'open',
  priority      report_priority NOT NULL DEFAULT 'medium',
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on reports
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          VARCHAR(100) NOT NULL,
  target_type     VARCHAR(50) NOT NULL,
  target_id       UUID,
  before_snapshot JSONB,
  after_snapshot  JSONB,
  reason          TEXT,
  notes           TEXT,
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  correlation_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on audit logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs (admin_id);

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  platform   VARCHAR(50),
  device     VARCHAR(100),
  app_version VARCHAR(50),
  country    VARCHAR(100),
  city       VARCHAR(100),
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
