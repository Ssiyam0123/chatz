-- Reverse of 005_message_read.

ALTER TABLE group_message_status
  DROP CONSTRAINT IF EXISTS fk_group_message_status__message_id,
  DROP CONSTRAINT IF EXISTS fk_group_message_status__group_id,
  DROP CONSTRAINT IF EXISTS fk_group_message_status__user_id;

DROP TABLE IF EXISTS group_message_status;

ALTER TABLE message_status
  DROP CONSTRAINT IF EXISTS fk_message_status__message_id,
  DROP CONSTRAINT IF EXISTS fk_message_status__user_id;

DROP TABLE IF EXISTS message_status;
