import Story from './story.model.js';
import User from '../user/user.model.js';

// Create a new story
export const createStory = async (req, res) => {
  try {
    const { image, text } = req.body;

    if (!image) {
      return res.status(400).json({ status: 'error', message: 'Story image is required' });
    }

    const story = await Story.create({
      user: req.user._id,
      image,
      text: text || "",
      viewers: []
    });

    const populatedStory = await Story.findById(story._id)
      .populate('user', 'name avatar')
      .exec();

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
    const user = await User.findById(req.user._id);
    const userIds = [req.user._id, ...user.friends];

    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      user: { $in: userIds },
      createdAt: { $gte: activeThreshold }
    })
    .sort({ createdAt: 1 })
    .populate('user', 'name avatar')
    .populate('viewers', 'name avatar')
    .exec();

    // Group stories by user
    const groupedMap = {};
    
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!groupedMap[userId]) {
        groupedMap[userId] = {
          user: story.user,
          stories: []
        };
      }
      groupedMap[userId].stories.push({
        _id: story._id,
        image: story.image,
        text: story.text,
        viewers: story.viewers || [],
        createdAt: story.createdAt
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
    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({ status: 'error', message: 'Story not found' });
    }

    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();

      // Populate story to broadcast update
      const populatedStory = await Story.findById(storyId)
        .populate('user', 'name avatar')
        .populate('viewers', 'name avatar')
        .exec();

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
