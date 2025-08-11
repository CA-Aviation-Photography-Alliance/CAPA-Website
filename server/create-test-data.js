import mongoose from "mongoose";
import SimpleEvent from "./models/SimpleEvent.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/capa-events";

// Sample events data
const sampleEvents = [
  {
    startdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    enddate: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
    ), // 2 hours later
    type: "workshop",
    title: "Introduction to Web Development",
    description:
      "Learn the fundamentals of HTML, CSS, and JavaScript. Perfect for beginners who want to start their journey in web development.",
    creator: "Tech Academy",
  },
  {
    startdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    enddate: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
    ), // 6 hours later
    type: "conference",
    title: "Annual Tech Conference 2024",
    description:
      "Join us for the biggest technology conference of the year featuring keynotes, workshops, and networking opportunities with industry leaders.",
    creator: "Tech Events Inc",
  },
  {
    startdate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    enddate: new Date(
      Date.now() + 21 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
    ), // 1 hour later
    type: "meeting",
    title: "Team Planning Session",
    description:
      "Monthly team planning and review meeting to discuss project progress, upcoming milestones, and resource allocation.",
    creator: "Project Manager",
  },
  {
    startdate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    enddate: new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    ), // 3 hours later
    type: "seminar",
    title: "Data Science Fundamentals",
    description:
      "Explore the basics of data science including statistics, machine learning, and data visualization techniques.",
    creator: "Data Science Institute",
  },
  {
    startdate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
    enddate: new Date(
      Date.now() + 28 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000,
    ), // 8 hours later
    type: "hackathon",
    title: "Innovation Hackathon 2024",
    description:
      "24-hour hackathon focused on creating innovative solutions for sustainability and climate change challenges.",
    creator: "Innovation Hub",
  },
  {
    startdate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    enddate: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000,
    ), // 1.5 hours later
    type: "webinar",
    title: "Remote Work Best Practices",
    description:
      "Learn effective strategies for remote work, time management, and maintaining work-life balance in a distributed team environment.",
    creator: "Remote Work Experts",
  },
  {
    startdate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 5 weeks from now
    enddate: new Date(
      Date.now() + 35 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
    ), // 4 hours later
    type: "training",
    title: "Advanced React Development",
    description:
      "Deep dive into advanced React concepts including hooks, context, performance optimization, and testing strategies.",
    creator: "Frontend Masters",
  },
  {
    startdate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    enddate: new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
    ), // 2 hours later
    type: "networking",
    title: "Tech Professionals Networking Event",
    description:
      "Connect with fellow technology professionals, share experiences, and build meaningful professional relationships.",
    creator: "Tech Networking Group",
  },
  {
    startdate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000), // 6 weeks from now
    enddate: new Date(
      Date.now() + 42 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    ), // 3 hours later
    type: "panel",
    title: "Women in Tech Panel Discussion",
    description:
      "Panel discussion featuring successful women leaders in technology sharing their experiences and insights.",
    creator: "Women in Tech Organization",
  },
  {
    startdate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    enddate: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
    ), // 1 hour later
    type: "standup",
    title: "Weekly Team Standup",
    description:
      "Regular weekly standup meeting to discuss progress, blockers, and upcoming work for the development team.",
    creator: "Scrum Master",
  },
];

async function createTestData() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Check if data already exists
    const existingCount = await SimpleEvent.countDocuments();
    console.log(`📈 Current events in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log("⚠️  Database already contains events.");
      console.log(
        "❓ Do you want to clear existing data and create fresh sample data?",
      );
      console.log("   This will DELETE all existing events!");

      // For now, we'll just add new data without clearing
      console.log("🔄 Adding sample data alongside existing events...");
    }

    console.log("📝 Creating sample events...");

    // Insert sample events
    const createdEvents = await SimpleEvent.insertMany(sampleEvents);
    console.log(
      `✅ Successfully created ${createdEvents.length} sample events`,
    );

    console.log("\n📋 Created Events:");
    console.log("=".repeat(80));

    createdEvents.forEach((event, index) => {
      const startDate = new Date(event.startdate).toLocaleDateString();
      const startTime = new Date(event.startdate).toLocaleTimeString();
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Type: ${event.type} | Creator: ${event.creator}`);
      console.log(`   Start: ${startDate} at ${startTime}`);
      console.log(`   Duration: ${event.durationHours} hours`);
      console.log(`   ID: ${event._id}`);
      console.log("   " + "-".repeat(70));
    });

    // Display statistics
    const stats = await SimpleEvent.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📊 Event Statistics by Type:");
    console.log("=".repeat(40));
    stats.forEach((stat) => {
      console.log(`${stat._id}: ${stat.count} events`);
    });

    const totalEvents = await SimpleEvent.countDocuments();
    const upcomingEvents = await SimpleEvent.countDocuments({
      startdate: { $gte: new Date() },
    });

    console.log("\n📈 Database Summary:");
    console.log("=".repeat(40));
    console.log(`Total events: ${totalEvents}`);
    console.log(`Upcoming events: ${upcomingEvents}`);
    console.log(`Past events: ${totalEvents - upcomingEvents}`);

    console.log("\n🎉 Sample data creation completed successfully!");
    console.log("\n🚀 Next Steps:");
    console.log("1. Start your server: npm start");
    console.log("2. Test the API: node test-simple-events.js");
    console.log("3. View events: curl http://localhost:3003/api/simple-events");
    console.log(
      "4. View upcoming: curl http://localhost:3003/api/simple-events/upcoming",
    );
  } catch (error) {
    console.error("❌ Error creating sample data:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.error(
        "\n💡 MongoDB connection refused. Please ensure MongoDB is running:",
      );
      console.error(
        "   - macOS: brew services start mongodb/brew/mongodb-community",
      );
      console.error("   - Linux: sudo systemctl start mongod");
      console.error("   - Windows: net start MongoDB");
      console.error(
        "   - Docker: docker run -d -p 27017:27017 --name mongodb mongo",
      );
    }

    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Handle script interruption gracefully
process.on("SIGINT", async () => {
  console.log("\n⚠️  Script interrupted");
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
  process.exit(0);
});

// Run the script
console.log("🎯 CAPA Events - Sample Data Creator");
console.log("====================================\n");
createTestData();
