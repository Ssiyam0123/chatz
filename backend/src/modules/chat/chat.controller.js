import Message from './message.model.js';
import User from '../user/user.model.js';
import mongoose from 'mongoose';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email avatar bio publicKey');
    res.status(200).json({ status: 'success', data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    // Friend request system guard
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.friends.includes(partnerId)) {
      return res.status(403).json({ 
        status: 'error', 
        message: "You can only view chat history with friends." 
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: partnerId },
        { sender: partnerId, receiver: req.user.id }
      ]
    })
    .populate('sender', 'name avatar publicKey')
    .populate('receiver', 'name avatar publicKey')
    .sort({ createdAt: 1 });
    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $first: "$text" },
          lastMessageImage: { $first: "$image" },
          lastMessageCiphertext: { $first: "$ciphertext" },
          lastMessageNonce: { $first: "$nonce" },
          lastMessageIsEncrypted: { $first: "$isEncrypted" },
          lastMessageTime: { $first: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      { $project: { "userDetails.password": 0 } }
    ]);

    res.status(200).json({ status: 'success', data: conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};