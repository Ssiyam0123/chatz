import Message from './message.model.js';
import User from '../user/user.model.js';
import mongoose from 'mongoose';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email');
    res.status(200).json({ status: 'success', data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: partnerId },
        { sender: partnerId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });
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