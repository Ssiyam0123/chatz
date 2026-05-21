import { Story, StoryViewer, User } from '../../models/index.js';
import { Op } from 'sequelize';

// Create a new story
export const createStory = async (req, res) => {
  try {
    const { image, text } = req.body;

    if (!image) {
      return res.status(400).json({ status: 'error', message: 'Story image is required' });
    }

    const story = await Story.create({
      userId: req.user.id,
      image,
      text: text || '',
    });

    const populatedStory = await Story.findByPk(story.id, {
      include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
    });

    // Broadcast new story event
    const io = req.app.get('io');
    if (io) {
      io.emit('new_story', populatedStory);
    }

    res.status(201).json({ status: 'success', data: populatedStory });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get stories of current user and their friends (active in the last 24 hours)
export const getStories = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ association: 'friends', attributes: ['id'] }],
    });

    const friendIds = user.friends.map((f) => f.id);
    const userIds = [req.user.id, ...friendIds];

    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.findAll({
      where: {
        userId: { [Op.in]: userIds },
        createdAt: { [Op.gte]: activeThreshold },
      },
      include: [
        { association: 'user', attributes: ['id', 'name', 'avatar'] },
        { association: 'viewers', include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }] },
      ],
      order: [['createdAt', 'ASC']],
    });

    // Group stories by user
    const groupedMap = {};

    stories.forEach((story) => {
      const userId = story.user.id;
      if (!groupedMap[userId]) {
        groupedMap[userId] = {
          user: story.user,
          stories: [],
        };
      }
      groupedMap[userId].stories.push({
        _id: story.id,
        image: story.image,
        text: story.text,
        viewers: story.viewers ? story.viewers.map((v) => v.user || v) : [],
        createdAt: story.createdAt,
      });
    });

    const groupedStories = Object.values(groupedMap);

    res.status(200).json({ status: 'success', data: groupedStories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Record a user viewing a story
export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findByPk(storyId);

    if (!story) {
      return res.status(404).json({ status: 'error', message: 'Story not found' });
    }

    // Check if user already viewed
    const existingView = await StoryViewer.findOne({
      where: { storyId, userId: req.user.id },
    });

    if (!existingView) {
      await StoryViewer.create({ storyId, userId: req.user.id });

      // Broadcast updated story
      const populatedStory = await Story.findByPk(storyId, {
        include: [
          { association: 'user', attributes: ['id', 'name', 'avatar'] },
          { association: 'viewers', include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }] },
        ],
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('new_story', populatedStory);
      }
    }

    res.status(200).json({ status: 'success', data: story });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
