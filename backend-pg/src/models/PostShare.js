import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PostShare = sequelize.define('PostShare', {
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
}, {
  tableName: 'post_shares',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['post_id', 'user_id'],
    },
  ],
});

export default PostShare;
