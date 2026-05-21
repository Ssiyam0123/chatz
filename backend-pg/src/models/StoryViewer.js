import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StoryViewer = sequelize.define('StoryViewer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  storyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'story_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
}, {
  tableName: 'story_viewers',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['story_id', 'user_id'],
    },
  ],
});

export default StoryViewer;
