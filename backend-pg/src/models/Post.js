import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  content: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  originalPostId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    field: 'original_post_id',
  },
}, {
  tableName: 'posts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

export default Post;
