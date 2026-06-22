-- ─────────────────────────────────────────────────────────────────────────────
-- Revert 009_admin_roles.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS case_notes;
DROP TABLE IF EXISTS admin_actions;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS reports;

DROP TYPE IF EXISTS report_priority;
DROP TYPE IF EXISTS report_status;

ALTER TABLE users
  DROP COLUMN IF EXISTS warnings,
  DROP COLUMN IF EXISTS suspended_until,
  DROP COLUMN IF EXISTS suspended_at,
  DROP COLUMN IF EXISTS banned_at,
  DROP COLUMN IF EXISTS role;

DROP TYPE IF EXISTS user_role;
