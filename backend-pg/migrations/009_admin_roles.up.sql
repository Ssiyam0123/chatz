-- ─────────────────────────────────────────────────────────────────────────────
-- 009_admin_roles: add role-based access control, reports, audit logs,
-- analytics events, admin actions, and case notes.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── User role ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'analyst', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role        user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS banned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warnings    JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_role      ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_banned    ON users (banned_at) WHERE banned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users (suspended_at) WHERE suspended_at IS NOT NULL;

-- ─── Reports ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'in_review', 'dismissed', 'action_taken', 'escalated', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_priority AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES users(id),
  target_type   VARCHAR(50) NOT NULL,
  target_id     UUID NOT NULL,
  reason        VARCHAR(255) NOT NULL,
  details       TEXT,
  status        report_status NOT NULL DEFAULT 'open',
  priority      report_priority NOT NULL DEFAULT 'normal',
  assigned_to   UUID REFERENCES users(id),
  escalated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_target      ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_assigned    ON reports (assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_priority    ON reports (priority);
CREATE INDEX IF NOT EXISTS idx_reports_reporter    ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created     ON reports (created_at);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id         UUID NOT NULL REFERENCES users(id),
  action           VARCHAR(255) NOT NULL,
  target_type      VARCHAR(50),
  target_id        UUID,
  before_snapshot  JSONB,
  after_snapshot   JSONB,
  reason           TEXT,
  notes            TEXT,
  ip_address       VARCHAR(45),
  user_agent       TEXT,
  correlation_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin   ON audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target  ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);

-- ─── Analytics Events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   VARCHAR(100) NOT NULL,
  user_id      UUID REFERENCES users(id),
  session_id   VARCHAR(255),
  device_type  VARCHAR(50),
  platform     VARCHAR(50),
  app_version  VARCHAR(50),
  country      VARCHAR(100),
  region       VARCHAR(100),
  city         VARCHAR(100),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type    ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user    ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events (event_type, created_at);

-- ─── Admin Actions (tracks specific moderation actions per report) ───────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID REFERENCES reports(id),
  admin_id     UUID NOT NULL REFERENCES users(id),
  action_type  VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50),
  target_id    UUID,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_report ON admin_actions (report_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin  ON admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at);

-- ─── Case Notes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_report ON case_notes (report_id);
