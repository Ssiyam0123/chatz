import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GroupMessage = sequelize.define('GroupMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'group_id',
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sender_id',
  },
  text: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
}, {
  tableName: 'group_messages',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['group_id', 'created_at'],
    },
  ],
});

export default GroupMessage;
