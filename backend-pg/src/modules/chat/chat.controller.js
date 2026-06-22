import pool from '../../config/pgDatabase.js';

export const getAllUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20');
    const page = parseInt(req.query.page || '1');
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let countSql = 'SELECT COUNT(*) FROM users WHERE id != $1';
    let dataSql = 'SELECT id, name, email, avatar, bio, public_key as "publicKey" FROM users WHERE id != $1';
    const values = [req.user.id];

    if (search) {
      countSql += ' AND (name ILIKE $2 OR email ILIKE $2)';
      dataSql += ' AND (name ILIKE $2 OR email ILIKE $2)';
      values.push(`%${search}%`);
    }

    dataSql += ` ORDER BY name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

    const [{ rows: countRows }, { rows: users }] = await Promise.all([
      pool.query(countSql, values),
      pool.query(dataSql, [...values, limit, offset]),
    ]);

    const count = parseInt(countRows[0].count);

    res.status(200).json({
      status: 'success',
      data: users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const limit = parseInt(req.query.limit || '30');
    const before = req.query.before; // ISO timestamp string or cursor

    // Friend request system guard - check user_friends link table directly
    const { rows: friendRows } = await pool.query(
      `SELECT 1 FROM user_friends 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [req.user.id, partnerId]
    );

    if (friendRows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view chat history with friends.',
      });
    }

    let sql = `
      SELECT 
        m.id, m.text, m.image, m.ciphertext, m.nonce, m.is_encrypted as "isEncrypted", m.created_at as "createdAt", m.updated_at as "updatedAt",
        m.sender_id as "senderId", m.receiver_id as "receiverId",
        json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar, 'publicKey', s.public_key) as sender,
        json_build_object('id', r.id, 'name', r.name, 'avatar', r.avatar, 'publicKey', r.public_key) as receiver
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
    `;

    const values = [req.user.id, partnerId];

    if (before) {
      sql += ` AND m.created_at < $3`;
      values.push(new Date(before));
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const { rows: messages } = await pool.query(sql, values);

    // Reverse to return in chronological order
    messages.reverse();

    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit || '20');
    const page = parseInt(req.query.page || '1');
    const offset = (page - 1) * limit;

    // DISTINCT ON query to get the latest message for each partner, sorted by created_at DESC
    const rawConversationsQuery = `
      SELECT m.id, m.text, m.image, m.ciphertext, m.nonce, m.is_encrypted AS "isEncrypted", m.created_at AS "createdAt",
             m.sender_id AS "senderId", m.receiver_id AS "receiverId",
             u_sender.id AS "sender.id", u_sender.name AS "sender.name", u_sender.avatar AS "sender.avatar", u_sender.public_key AS "sender.publicKey",
             u_receiver.id AS "receiver.id", u_receiver.name AS "receiver.name", u_receiver.avatar AS "receiver.avatar", u_receiver.public_key AS "receiver.publicKey"
      FROM (
        SELECT DISTINCT ON (
          CASE 
            WHEN sender_id = $1 THEN receiver_id 
            ELSE sender_id 
          END
        ) *
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY 
          CASE 
            WHEN sender_id = $1 THEN receiver_id 
            ELSE sender_id 
          END,
          created_at DESC
      ) m
      LEFT JOIN users u_sender ON m.sender_id = u_sender.id
      LEFT JOIN users u_receiver ON m.receiver_id = u_receiver.id
      ORDER BY m.created_at DESC
    `;

    const { rows: conversationsResult } = await pool.query(rawConversationsQuery, [userId]);

    // Format results to match the original structure expected by frontend
    const directConversations = conversationsResult.map((row) => {
      const partnerId = row.senderId === userId ? row.receiverId : row.senderId;
      const partner = row.senderId === userId
        ? { id: row['receiver.id'], name: row['receiver.name'], avatar: row['receiver.avatar'], publicKey: row['receiver.publicKey'] }
        : { id: row['sender.id'], name: row['sender.name'], avatar: row['sender.avatar'], publicKey: row['sender.publicKey'] };

      return {
        _id: partnerId,
        lastMessage: row.isEncrypted ? '🔒 Encrypted Message' : row.image ? '📷 Image' : row.text,
        lastMessageTime: row.createdAt,
        lastMessageImage: row.image || null,
        lastMessageCiphertext: row.ciphertext || null,
        lastMessageNonce: row.nonce || null,
        lastMessageIsEncrypted: row.isEncrypted,
        userDetails: partner,
        isGroup: false,
      };
    });

    // Fetch all active friends to include those with no message history yet
    const { rows: friends } = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.public_key as "publicKey", uf.created_at as "friendshipCreatedAt"
       FROM user_friends uf
       JOIN users u ON uf.friend_id = u.id
       WHERE uf.user_id = $1`,
      [userId]
    );

    const existingPartnerIds = new Set(directConversations.map(c => c._id));

    friends.forEach((friend) => {
      if (!existingPartnerIds.has(friend.id)) {
        directConversations.push({
          _id: friend.id,
          lastMessage: 'No messages yet',
          lastMessageTime: friend.friendshipCreatedAt || new Date(0).toISOString(),
          lastMessageImage: null,
          lastMessageCiphertext: null,
          lastMessageNonce: null,
          lastMessageIsEncrypted: false,
          userDetails: {
            id: friend.id,
            name: friend.name,
            avatar: friend.avatar,
            publicKey: friend.publicKey,
          },
          isGroup: false,
        });
      }
    });

    // ─── Fetch Group Conversations ───
    const { rows: memberships } = await pool.query('SELECT group_id as "groupId" FROM group_members WHERE user_id = $1', [userId]);
    const groupIds = memberships.map((m) => m.groupId);

    let groups = [];
    if (groupIds.length > 0) {
      const { rows } = await pool.query(
        `SELECT id, name, avatar, created_at as "createdAt" FROM groups WHERE id = ANY($1)`,
        [groupIds]
      );
      groups = rows;
    }

    let latestGroupMessages = [];
    if (groupIds.length > 0) {
      const { rows } = await pool.query(`
        SELECT DISTINCT ON (group_id) group_id AS "groupId", text, image, created_at AS "createdAt"
        FROM group_messages
        WHERE group_id = ANY($1)
        ORDER BY group_id, created_at DESC
      `, [groupIds]);
      latestGroupMessages = rows;
    }

    const groupMessagesMap = {};
    latestGroupMessages.forEach((msg) => {
      groupMessagesMap[msg.groupId] = msg;
    });

    const groupConversations = groups.map((group) => {
      const latestMsg = groupMessagesMap[group.id];
      return {
        _id: group.id,
        lastMessage: latestMsg ? (latestMsg.image ? '📷 Image' : latestMsg.text) : 'No messages yet',
        lastMessageTime: latestMsg ? latestMsg.createdAt : group.createdAt,
        isGroup: true,
        name: group.name,
        avatar: group.avatar,
        userDetails: {
          id: group.id,
          name: group.name,
          avatar: group.avatar,
        },
      };
    });

    // Combine and sort
    const combinedConversations = [...directConversations, ...groupConversations];
    combinedConversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    // Paginate in memory
    const total = combinedConversations.length;
    const paginatedConversations = combinedConversations.slice(offset, offset + limit);

    res.status(200).json({
      status: 'success',
      data: paginatedConversations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
