-- Drop indexes
DROP INDEX IF EXISTS idx_analytics_events_created_at;
DROP INDEX IF EXISTS idx_analytics_events_name;
DROP INDEX IF EXISTS idx_admin_audit_logs_admin_id;
DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_reports_target;

-- Drop tables
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS reports;

-- Drop types
DROP TYPE IF EXISTS report_priority;
DROP TYPE IF EXISTS report_status;
DROP TYPE IF EXISTS report_target_type;

-- Remove role column from users
ALTER TABLE users DROP COLUMN IF EXISTS role;
