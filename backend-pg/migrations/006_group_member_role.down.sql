-- Reverse of 006_group_member_role.

DROP INDEX IF EXISTS idx_group_members_role;

ALTER TABLE group_members DROP COLUMN IF EXISTS role;

DROP TYPE IF EXISTS group_member_role;
