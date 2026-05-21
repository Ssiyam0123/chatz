import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserFriend = sequelize.define('UserFriend', {
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
  friendId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'friend_id',
  },
}, {
  tableName: 'user_friends',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'friend_id'],
    },
  ],
});

export default UserFriend;
