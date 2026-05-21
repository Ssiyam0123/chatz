import { User, Message } from '../../models/index.js';
import { Op } from 'sequelize';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey'],
    });
    res.status(200).json({ status: 'success', data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { partnerId } = req.params;

    // Friend request system guard
    const currentUser = await User.findByPk(req.user.id, {
      include: [{ association: 'friends', attributes: ['id'] }],
    });

    const isFriend = currentUser.friends?.some((f) => f.id === partnerId);
    if (!currentUser || !isFriend) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view chat history with friends.',
      });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: partnerId },
          { senderId: partnerId, receiverId: req.user.id },
        ],
      },
      include: [
        { association: 'sender', attributes: ['id', 'name', 'avatar', 'publicKey'] },
        { association: 'receiver', attributes: ['id', 'name', 'avatar', 'publicKey'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages where the user is sender or receiver
    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      include: [
        {
          association: 'sender',
          attributes: ['id', 'name', 'avatar', 'publicKey'],
        },
        {
          association: 'receiver',
          attributes: ['id', 'name', 'avatar', 'publicKey'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group by conversation partner and take the latest message
    const conversationMap = new Map();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(partnerId)) {
        const partner = msg.senderId === userId ? msg.receiver : msg.sender;
        conversationMap.set(partnerId, {
          _id: partnerId,
          lastMessage: msg.isEncrypted ? '🔒 Encrypted Message' : msg.image ? '📷 Image' : msg.text,
          lastMessageTime: msg.createdAt,
          lastMessageImage: msg.image || null,
          lastMessageCiphertext: msg.ciphertext || null,
          lastMessageNonce: msg.nonce || null,
          lastMessageIsEncrypted: msg.isEncrypted,
          userDetails: partner,
        });
      }
    }

    const conversations = Array.from(conversationMap.values());

    res.status(200).json({ status: 'success', data: conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
