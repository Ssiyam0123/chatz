import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PostReaction = sequelize.define('PostReaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'post_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  type: {
    type: DataTypes.ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry'),
    defaultValue: 'like',
  },
}, {
  tableName: 'post_reactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['post_id', 'user_id'],
    },
  ],
});

export default PostReaction;
