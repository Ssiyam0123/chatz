import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Story = sequelize.define('Story', {
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
  image: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Story image is required' },
    },
  },
  text: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
}, {
  tableName: 'stories',
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
  comment: 'TTL/expiry of 24h must be handled at the app level (e.g., periodic cleanup via cron/job) — PostgreSQL has no built-in TTL index like MongoDB.'
});

export default Story;
