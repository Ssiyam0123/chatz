import { Group, GroupMember, GroupMessage, User } from '../../models/index.js';
import { Op } from 'sequelize';

// Helper: check membership
const isMember = async (groupId, userId) => {
  const count = await GroupMember.count({
    where: { groupId, userId },
  });
  return count > 0;
};

// Create group
export const createGroup = async (req, res) => {
  try {
    const { name, memberIds, avatar } = req.body;
    const uniqueMemberIds = [...new Set([req.user.id, ...memberIds])];

    const group = await Group.create({
      name,
      creatorId: req.user.id,
      avatar: avatar || '',
    });

    // Add all members (including creator)
    const memberRecords = uniqueMemberIds.map((userId) => ({
      groupId: group.id,
      userId,
    }));
    await GroupMember.bulkCreate(memberRecords, { ignoreDuplicates: true });

    // Return populated group
    const populated = await Group.findByPk(group.id, {
      include: [
        { association: 'members', attributes: ['id', 'name', 'avatar'] },
        { association: 'creator', attributes: ['id', 'name'] },
      ],
    });

    res.status(201).json({ status: 'success', data: populated });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// Get all groups for current user
export const getUserGroups = async (req, res) => {
  try {
    // Find all group IDs where current user is a member
    const memberships = await GroupMember.findAll({
      where: { userId: req.user.id },
      attributes: ['groupId'],
    });

    const groupIds = memberships.map((m) => m.groupId);

    const groups = await Group.findAll({
      where: { id: { [Op.in]: groupIds } },
      include: [
        { association: 'members', attributes: ['id', 'name', 'avatar'] },
        { association: 'creator', attributes: ['id', 'name'] },
      ],
    });

    res.status(200).json({ status: 'success', data: groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single group by ID
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findByPk(groupId, {
      include: [
        { association: 'members', attributes: ['id', 'name', 'avatar'] },
        { association: 'creator', attributes: ['id', 'name'] },
      ],
    });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const membership = await isMember(groupId, req.user.id);
    if (!membership) {
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

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const membership = await isMember(groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const messages = await GroupMessage.findAll({
      where: { groupId },
      include: [
        { association: 'sender', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add members to group
export const addMembers = async (req, res) => {
  try {
    const { groupId, memberIds } = req.body;
    const group = await Group.findByPk(groupId);

    if (!group || group.creatorId !== req.user.id) {
      return res.status(403).json({ message: 'Only creator can add members' });
    }

    // Filter out existing members
    const existingMembers = await GroupMember.findAll({
      where: { groupId },
      attributes: ['userId'],
    });
    const existingIds = existingMembers.map((m) => m.userId);
    const newMemberIds = memberIds.filter((id) => !existingIds.includes(id));

    // Add new members
    const memberRecords = newMemberIds.map((userId) => ({
      groupId,
      userId,
    }));
    await GroupMember.bulkCreate(memberRecords, { ignoreDuplicates: true });

    // Return updated group with members
    const populated = await Group.findByPk(groupId, {
      include: [
        { association: 'members', attributes: ['id', 'name', 'avatar'] },
        { association: 'creator', attributes: ['id', 'name'] },
      ],
    });

    res.status(200).json({ status: 'success', data: populated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
