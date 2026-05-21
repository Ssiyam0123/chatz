import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PostCommentReaction = sequelize.define('PostCommentReaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  commentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'comment_id',
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
  tableName: 'post_comment_reactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['comment_id', 'user_id'],
    },
  ],
});

export default PostCommentReaction;
