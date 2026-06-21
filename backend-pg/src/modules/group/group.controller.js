import pool from '../../config/pgDatabase.js';

// Helper: check membership
const isMember = async (groupId, userId) => {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return rowCount > 0;
};

// Helper: fetch populated group
const getPopulatedGroup = async (groupId) => {
  const sql = `
    SELECT 
      g.id, g.name, g.avatar, g.created_at as "createdAt", g.updated_at as "updatedAt", g.creator_id as "creatorId",
      json_build_object('id', c.id, 'name', c.name) as creator,
      COALESCE(
        (SELECT json_agg(
          json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar)
        ) FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = g.id), '[]'::json
      ) as members
    FROM groups g
    JOIN users c ON g.creator_id = c.id
    WHERE g.id = $1
  `;
  const { rows } = await pool.query(sql, [groupId]);
  return rows[0];
};

// Create group
export const createGroup = async (req, res) => {
  try {
    const { name, memberIds, avatar } = req.body;
    const uniqueMemberIds = [...new Set([req.user.id, ...(memberIds || [])])];

    const { rows: groups } = await pool.query(
      `INSERT INTO groups (name, creator_id, avatar, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [name, req.user.id, avatar || '']
    );
    const groupId = groups[0].id;

    if (uniqueMemberIds.length > 0) {
      const values = [];
      const placeholders = [];
      let i = 1;
      for (const userId of uniqueMemberIds) {
        placeholders.push(`($${i++}, $${i++})`);
        values.push(groupId, userId);
      }
      await pool.query(
        `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
        values
      );
    }

    const populated = await getPopulatedGroup(groupId);

    res.status(201).json({ status: 'success', data: populated });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// Get all groups for current user
export const getUserGroups = async (req, res) => {
  try {
    const sql = `
      SELECT 
        g.id, g.name, g.avatar, g.created_at as "createdAt", g.updated_at as "updatedAt", g.creator_id as "creatorId",
        json_build_object('id', c.id, 'name', c.name) as creator,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar)
          ) FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = g.id), '[]'::json
        ) as members
      FROM groups g
      JOIN users c ON g.creator_id = c.id
      WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = $1)
    `;
    const { rows: groups } = await pool.query(sql, [req.user.id]);

    res.status(200).json({ status: 'success', data: groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single group by ID
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const membership = await isMember(groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const group = await getPopulatedGroup(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    res.status(200).json({ status: 'success', data: group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const { rowCount: groupExists } = await pool.query('SELECT 1 FROM groups WHERE id = $1', [groupId]);
    if (groupExists === 0) return res.status(404).json({ message: 'Group not found' });

    const membership = await isMember(groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const { rows: messages } = await pool.query(
      `SELECT 
        gm.id, gm.text, gm.image, gm.created_at as "createdAt", gm.updated_at as "updatedAt",
        gm.group_id as "groupId", gm.sender_id as "senderId",
        json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar) as sender
       FROM group_messages gm
       JOIN users s ON gm.sender_id = s.id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC`,
      [groupId]
    );

    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add members to group
export const addMembers = async (req, res) => {
  try {
    const { groupId, memberIds } = req.body;
    
    const { rows: groups } = await pool.query('SELECT creator_id as "creatorId" FROM groups WHERE id = $1', [groupId]);
    
    if (groups.length === 0 || groups[0].creatorId !== req.user.id) {
      return res.status(403).json({ message: 'Only creator can add members' });
    }

    if (memberIds && memberIds.length > 0) {
      const values = [];
      const placeholders = [];
      let i = 1;
      for (const userId of memberIds) {
        placeholders.push(`($${i++}, $${i++})`);
        values.push(groupId, userId);
      }
      await pool.query(
        `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
        values
      );
    }

    const populated = await getPopulatedGroup(groupId);

    res.status(200).json({ status: 'success', data: populated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
