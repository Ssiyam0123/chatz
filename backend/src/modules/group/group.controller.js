import Group from './group.model.js';
import GroupMessage from './groupMessage.model.js';
import User from '../user/user.model.js';

// Helper: safely compare ObjectId or string to a string userId
const isMember = (members, userId) =>
  members.some((m) => m.toString() === userId.toString());

// Create group
export const createGroup = async (req, res) => {
  try {
    const { name, memberIds, avatar } = req.body;
    const members = [...new Set([req.user.id, ...memberIds])];

    const group = await Group.create({
      name,
      creator: req.user.id,
      members,
      avatar: avatar || '',
    });

    // Return populated group so the client has member details immediately
    const populated = await Group.findById(group._id)
      .populate('members', 'name avatar')
      .populate('creator', 'name');

    res.status(201).json({ status: 'success', data: populated });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// Get all groups for current user
export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('members', 'name avatar')
      .populate('creator', 'name');
    res.status(200).json({ status: 'success', data: groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single group by ID (needed for chat header details)
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('members', 'name avatar')
      .populate('creator', 'name');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    // BUG FIX: use isMember helper — group.members is ObjectId[], not string[]
    if (!isMember(group.members, req.user.id)) {
      return res.status(403).json({ message: 'Not a member' });
    }

    res.status(200).json({ status: 'success', data: group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    // BUG FIX: group.members is an array of ObjectIds — .includes() does reference
    // equality and will never match a plain string. Use .toString() comparison.
    if (!isMember(group.members, req.user.id)) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const messages = await GroupMessage.find({ group: groupId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add members to group
export const addMembers = async (req, res) => {
  try {
    const { groupId, memberIds } = req.body;
    const group = await Group.findById(groupId);

    if (!group || group.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only creator can add members' });
    }

    // BUG FIX: same ObjectId vs string issue — filter with .toString()
    const newMembers = memberIds.filter((id) => !isMember(group.members, id));
    group.members.push(...newMembers);
    await group.save();

    const populated = await Group.findById(groupId)
      .populate('members', 'name avatar')
      .populate('creator', 'name');

    res.status(200).json({ status: 'success', data: populated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
