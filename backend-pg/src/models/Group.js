import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Group name is required' },
    },
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'creator_id',
  },
  avatar: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
}, {
  tableName: 'groups',
  timestamps: true,
  underscored: true,
});

export default Group;
