import sequelize from './database.js';
import '../models/index.js';

async function initDatabase() {
  try {
    console.log('🔄 Syncing database models...');
    // Use alter: true to apply schema changes without dropping data
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
