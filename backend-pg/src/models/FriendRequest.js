import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FriendRequest = sequelize.define('FriendRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sender_id',
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'receiver_id',
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'friend_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['sender_id', 'receiver_id'],
    },
  ],
});

export default FriendRequest;
