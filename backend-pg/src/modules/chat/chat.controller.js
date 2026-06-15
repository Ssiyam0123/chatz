import { User, Message, Group, GroupMember, GroupMessage, UserFriend } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

export const getAllUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20');
    const page = parseInt(req.query.page || '1');
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {
      id: { [Op.ne]: req.user.id },
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey'],
      limit,
      offset,
      order: [['name', 'ASC']],
    });

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

    // Friend request system guard - check UserFriend link table directly
    const isFriend = await UserFriend.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId: partnerId },
          { userId: partnerId, friendId: req.user.id }
        ]
      }
    });

    if (!isFriend) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view chat history with friends.',
      });
    }

    const whereClause = {
      [Op.or]: [
        { senderId: req.user.id, receiverId: partnerId },
        { senderId: partnerId, receiverId: req.user.id },
      ],
    };

    if (before) {
      whereClause.createdAt = {
        [Op.lt]: new Date(before),
      };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        { association: 'sender', attributes: ['id', 'name', 'avatar', 'publicKey'] },
        { association: 'receiver', attributes: ['id', 'name', 'avatar', 'publicKey'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

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
            WHEN sender_id = :userId THEN receiver_id 
            ELSE sender_id 
          END
        ) *
        FROM messages
        WHERE sender_id = :userId OR receiver_id = :userId
        ORDER BY 
          CASE 
            WHEN sender_id = :userId THEN receiver_id 
            ELSE sender_id 
          END,
          created_at DESC
      ) m
      LEFT JOIN users u_sender ON m.sender_id = u_sender.id
      LEFT JOIN users u_receiver ON m.receiver_id = u_receiver.id
      ORDER BY m.created_at DESC
    `;

    const conversationsResult = await sequelize.query(rawConversationsQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });

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

    // ─── Fetch Group Conversations ───
    const memberships = await GroupMember.findAll({
      where: { userId },
      attributes: ['groupId'],
    });
    const groupIds = memberships.map((m) => m.groupId);

    const groups = await Group.findAll({
      where: { id: { [Op.in]: groupIds } },
      attributes: ['id', 'name', 'avatar', 'createdAt'],
    });

    let latestGroupMessages = [];
    if (groupIds.length > 0) {
      latestGroupMessages = await sequelize.query(`
        SELECT DISTINCT ON (group_id) group_id AS "groupId", text, image, created_at AS "createdAt"
        FROM group_messages
        WHERE group_id IN (:groupIds)
        ORDER BY group_id, created_at DESC
      `, {
        replacements: { groupIds },
        type: sequelize.QueryTypes.SELECT,
      });
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
