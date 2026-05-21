import { User, FriendRequest, UserFriend } from '../../models/index.js';
import { Op } from 'sequelize';

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends' });
      }
      if (existingRequest.status === 'pending') {
        if (existingRequest.senderId === senderId) {
          return res.status(400).json({ message: 'Friend request is already pending' });
        } else {
          return res.status(400).json({ message: 'A pending friend request exists from this user. Please accept it.' });
        }
      }
    }

    // Create friend request
    const request = await FriendRequest.create({
      senderId,
      receiverId,
      status: 'pending',
    });

    // Fetch with user details
    const populatedRequest = await FriendRequest.findByPk(request.id, {
      include: [
        { association: 'sender', attributes: ['id', 'name', 'avatar', 'bio', 'publicKey'] },
        { association: 'receiver', attributes: ['id', 'name', 'avatar', 'bio', 'publicKey'] },
      ],
    });

    res.status(201).json({
      status: 'success',
      data: populatedRequest,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Accept / Decline request
export const respondToFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' | 'declined'

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status response' });
    }

    const request = await FriendRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Only the receiver of the request can respond
    if (request.receiverId !== userId) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Friend request has already been ${request.status}` });
    }

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      // Add bidirectional friendship records
      await UserFriend.bulkCreate([
        { userId: request.senderId, friendId: request.receiverId },
        { userId: request.receiverId, friendId: request.senderId },
      ], { ignoreDuplicates: true });
    } else {
      // Delete declined request so users can request again
      await request.destroy();
    }

    res.status(200).json({
      status: 'success',
      message: `Friend request ${status}`,
      data: request,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get pending request list
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.findAll({
      where: {
        [Op.or]: [{ receiverId: userId }, { senderId: userId }],
        status: 'pending',
      },
      include: [
        { association: 'sender', attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey'] },
        { association: 'receiver', attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey'] },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get user's active friends
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [
        { association: 'friends', attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey'] },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: user.friends,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Remove friend / Unfriend
export const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    // Remove bidirectional friendship records
    await UserFriend.destroy({
      where: {
        [Op.or]: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    // Remove any friend request records
    await FriendRequest.destroy({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Unfriended successfully',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get "People You May Know" suggestions
export const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user and their friends
    const user = await User.findByPk(userId, {
      include: [{ association: 'friends', attributes: ['id'] }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build exclude list: self + current friends
    const excludeIds = [userId, ...user.friends.map((f) => f.id)];

    // Also exclude anyone with pending/accepted requests involving this user
    const activeRequests = await FriendRequest.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    activeRequests.forEach((req) => {
      excludeIds.push(req.senderId);
      excludeIds.push(req.receiverId);
    });

    const uniqueExcludeIds = [...new Set(excludeIds)];

    const suggestions = await User.findAll({
      where: { id: { [Op.notIn]: uniqueExcludeIds } },
      attributes: ['id', 'name', 'avatar', 'bio', 'publicKey'],
      limit: 10,
    });

    res.status(200).json({
      status: 'success',
      data: suggestions,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
