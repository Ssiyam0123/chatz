import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
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
  text: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  image: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
  ciphertext: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  nonce: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_encrypted',
  },
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['sender_id', 'receiver_id'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

export default Message;
