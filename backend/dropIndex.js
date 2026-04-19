import mongoose from 'mongoose';
import './src/modules/user/user.model.js'; // just to ensure connection

async function dropClerkIndex() {
  try {
    await mongoose.connect('mongodb+srv://yt:MNuNg1eKCoTi9cau@cluster0.kgw4w.mongodb.net/chatz?appName=Cluster0');
    const collection = mongoose.connection.collection('users');
    await collection.dropIndex('clerkId_1');
    console.log('Index dropped successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error dropping index:', err.message);
    process.exit(1);
  }
}
dropClerkIndex();