import FriendRequest from './friendRequest.model.js';
import User from '../user/user.model.js';

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    // Check receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: "You are already friends" });
      }
      if (existingRequest.status === 'pending') {
        if (existingRequest.sender.toString() === senderId) {
          return res.status(400).json({ message: "Friend request is already pending" });
        } else {
          return res.status(400).json({ message: "A pending friend request exists from this user. Please accept it." });
        }
      }
    }

    // Create friend request
    const request = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending'
    });

    // Populate sender details for immediate update
    const populatedRequest = await FriendRequest.findById(request._id)
      .populate('sender', 'name avatar bio publicKey')
      .populate('receiver', 'name avatar bio publicKey');

    res.status(201).json({
      status: 'success',
      data: populatedRequest
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
      return res.status(400).json({ message: "Invalid status response" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Only the receiver of the request can respond
    if (request.receiver.toString() !== userId) {
      return res.status(403).json({ message: "You are not authorized to respond to this request" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Friend request has already been ${request.status}` });
    }

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      // Add each other to friends array
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
      await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });
    } else {
      // Delete declined request so users can request again in future
      await FriendRequest.findByIdAndDelete(requestId);
    }

    res.status(200).json({
      status: 'success',
      message: `Friend request ${status}`,
      data: request
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get pending request list
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find pending requests sent to this user or sent by this user
    const requests = await FriendRequest.find({
      $or: [{ receiver: userId }, { sender: userId }],
      status: 'pending'
    })
    .populate('sender', 'name email avatar bio publicKey')
    .populate('receiver', 'name email avatar bio publicKey');

    res.status(200).json({
      status: 'success',
      data: requests
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get user's active friends
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('friends', 'name email avatar bio publicKey');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      status: 'success',
      data: user.friends
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

    // Pull from each other's friends array
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    // Remove any friendship record
    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    res.status(200).json({
      status: 'success',
      message: "Unfriended successfully"
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Exclude list: self and current friends
    const excludeIds = [userId, ...user.friends];

    // Find any pending or accepted friend requests involving the user
    const activeRequests = await FriendRequest.find({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    // Extract user IDs from requests
    activeRequests.forEach(req => {
      excludeIds.push(req.sender.toString());
      excludeIds.push(req.receiver.toString());
    });

    // Make list unique
    const uniqueExcludeIds = [...new Set(excludeIds)];

    // Fetch users not in exclude list
    // Limit to 10 for suggestions
    const suggestions = await User.find({
      _id: { $nin: uniqueExcludeIds }
    })
    .select('name avatar bio publicKey')
    .limit(10);

    res.status(200).json({
      status: 'success',
      data: suggestions
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
