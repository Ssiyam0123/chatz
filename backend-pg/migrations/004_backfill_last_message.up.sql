-- ─────────────────────────────────────────────────────────────────────────────
-- 004_backfill_last_message: populate conversations + conversation_members
-- from existing messages and group_messages. Idempotent (safe to re-run).
--
-- Direct conversations are keyed by the unordered participant pair, which now
-- lives directly on the conversations row (participant_lo / participant_hi),
-- so backfill is a single clean upsert.
-- ─────────────────────────────────────────────────────────────────────────────

-- ╭─ Direct conversations ───────────────────────────────────────────────────╮
-- Upsert one conversation row per unordered participant pair, carrying the
-- latest message's metadata.
INSERT INTO conversations (
  type, participant_lo, participant_hi,
  last_message_at, last_message_preview,
  last_message_is_encrypted, last_message_image
)
SELECT
  'direct'::conversation_type,
  pairs.lo,
  pairs.hi,
  pairs.last_at,
  CASE WHEN pairs.last_is_encrypted THEN NULL
       WHEN pairs.last_image IS NOT NULL THEN '📷 Image'
       ELSE pairs.last_text END,
  pairs.last_is_encrypted,
  (pairs.last_image IS NOT NULL)
FROM (
  SELECT DISTINCT ON (LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id))
    LEAST(m.sender_id, m.receiver_id)   AS lo,
    GREATEST(m.sender_id, m.receiver_id) AS hi,
    m.created_at                         AS last_at,
    m.is_encrypted                       AS last_is_encrypted,
    m.image                              AS last_image,
    m.text                               AS last_text
  FROM messages m
  ORDER BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id), m.created_at DESC
) pairs
ON CONFLICT (participant_lo, participant_hi) WHERE type = 'direct'
DO UPDATE SET
  last_message_at           = EXCLUDED.last_message_at,
  last_message_preview      = EXCLUDED.last_message_preview,
  last_message_is_encrypted = EXCLUDED.last_message_is_encrypted,
  last_message_image        = EXCLUDED.last_message_image,
  updated_at                = now();

-- Membership for direct conversations (both participants).
INSERT INTO conversation_members (conversation_id, user_id)
SELECT c.id, x.user_id
FROM conversations c
CROSS JOIN LATERAL (
  VALUES (c.participant_lo), (c.participant_hi)
) AS x(user_id)
WHERE c.type = 'direct'
ON CONFLICT DO NOTHING;

-- ╭─ Group conversations ────────────────────────────────────────────────────╮
INSERT INTO conversations (type, group_id, created_at)
SELECT 'group'::conversation_type, g.id, g.created_at
FROM groups g
ON CONFLICT (group_id) WHERE type = 'group' DO NOTHING;

-- Refresh last-message metadata for group conversations.
UPDATE conversations c
   SET last_message_at      = sub.last_at,
       last_message_preview = sub.preview,
       last_message_image   = sub.has_image,
       updated_at           = now()
  FROM (
    SELECT
      gm.group_id,
      MAX(gm.created_at) AS last_at,
      (ARRAY_AGG(gm.text     ORDER BY gm.created_at DESC))[1] AS last_text,
      (ARRAY_AGG(gm.image    ORDER BY gm.created_at DESC))[1] AS last_image
    FROM group_messages gm
    GROUP BY gm.group_id
  ) agg
CROSS JOIN LATERAL (
  SELECT
    agg.last_at,
    CASE WHEN agg.last_image IS NOT NULL THEN '📷 Image' ELSE agg.last_text END AS preview,
    (agg.last_image IS NOT NULL) AS has_image
) sub
WHERE c.type = 'group' AND c.group_id = agg.group_id;

-- Mirror group_members into conversation_members.
INSERT INTO conversation_members (conversation_id, user_id)
SELECT c.id, gm.user_id
FROM conversations c
JOIN group_members gm ON gm.group_id = c.group_id
WHERE c.type = 'group'
ON CONFLICT DO NOTHING;
