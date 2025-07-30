import mongoose from 'mongoose';
import SimpleEvent from './models/SimpleEvent.js';
import connectDB from './config/database.js';

async function cleanupOldEvents() {
  console.log('🧹 Starting cleanup of old format events...');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find all events with string creator (old format)
    const oldFormatEvents = await SimpleEvent.find({
      creator: { $type: "string" }
    });

    console.log(`📊 Found ${oldFormatEvents.length} events with old string creator format`);

    if (oldFormatEvents.length > 0) {
      console.log('📋 Events to be removed:');
      oldFormatEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. "${event.title}" by ${event.creator} (${event.type})`);
      });

      // Remove old format events
      const deleteResult = await SimpleEvent.deleteMany({
        creator: { $type: "string" }
      });

      console.log(`🗑️  Deleted ${deleteResult.deletedCount} old format events`);
    }

    // Count remaining events
    const remainingEvents = await SimpleEvent.countDocuments();
    console.log(`📈 Remaining events in database: ${remainingEvents}`);

    // Show sample of remaining events
    if (remainingEvents > 0) {
      const sampleEvents = await SimpleEvent.find().limit(3);
      console.log('📋 Sample of remaining events:');
      sampleEvents.forEach((event, index) => {
        const creatorName = event.creator?.name || 'Unknown';
        console.log(`  ${index + 1}. "${event.title}" by ${creatorName} (${event.type})`);
      });
    }

    console.log('✅ Cleanup completed successfully');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run cleanup
cleanupOldEvents();
