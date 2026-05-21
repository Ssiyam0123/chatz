import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GroupMember = sequelize.define('GroupMember', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
}, {
  tableName: 'group_members',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['group_id', 'user_id'],
    },
  ],
});

export default GroupMember;
