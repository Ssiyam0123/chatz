-- ─────────────────────────────────────────────────────────────────────────────
-- 006_group_member_role: add an explicit role to group memberships.
--
-- Today only `groups.creator_id` decides who can administer a group, which
-- blocks delegating admin powers. This adds a role column and promotes every
-- existing creator to 'admin'.
--
--   group_members.role ENUM('admin','member') DEFAULT 'member'
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE group_member_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS role group_member_role NOT NULL DEFAULT 'member';

-- Promote each group's creator to admin.
UPDATE group_members gm
   SET role = 'admin'
  FROM groups g
 WHERE g.id = gm.group_id
   AND g.creator_id = gm.user_id;

CREATE INDEX IF NOT EXISTS idx_group_members_role
  ON group_members (group_id, role) WHERE role = 'admin';
