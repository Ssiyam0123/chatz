import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PostComment = sequelize.define('PostComment', {
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
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Comment text is required' },
    },
  },
}, {
  tableName: 'post_comments',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['post_id', 'created_at'],
    },
  ],
});

export default PostComment;
