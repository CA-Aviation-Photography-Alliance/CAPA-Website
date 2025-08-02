import mongoose from "mongoose";

const simpleEventSchema = new mongoose.Schema(
  {
    startdate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    enddate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          return this.startdate <= value;
        },
        message: "End date must be after or equal to start date",
      },
    },
    type: {
      type: String,
      required: [true, "Event type is required"],
      trim: true,
      maxlength: [100, "Type cannot exceed 100 characters"],
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    creator: {
      userId: {
        type: String,
        required: [true, "Creator user ID is required"],
        trim: true,
        maxlength: [100, "User ID cannot exceed 100 characters"],
      },
      email: {
        type: String,
        required: [true, "Creator email is required"],
        trim: true,
        lowercase: true,
      },
      name: {
        type: String,
        required: [true, "Creator name is required"],
        trim: true,
        maxlength: [100, "Creator name cannot exceed 100 characters"],
      },
      nickname: {
        type: String,
        trim: true,
        maxlength: [50, "Nickname cannot exceed 50 characters"],
      },
      picture: {
        type: String,
        trim: true,
      },
    },
    location: {
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field for event duration in hours
simpleEventSchema.virtual("durationHours").get(function () {
  return (
    Math.round(((this.enddate - this.startdate) / (1000 * 60 * 60)) * 100) / 100
  );
});

// Virtual field to check if event is upcoming
simpleEventSchema.virtual("isUpcoming").get(function () {
  return new Date() < this.startdate;
});

// Index for efficient queries
simpleEventSchema.index({ startdate: 1 });
simpleEventSchema.index({ type: 1 });
simpleEventSchema.index({ "creator.userId": 1 });
simpleEventSchema.index({ "creator.email": 1 });
simpleEventSchema.index({ createdAt: -1 });

// Static method to find upcoming events
simpleEventSchema.statics.findUpcoming = function (limit = 10) {
  return this.find({
    startdate: { $gte: new Date() },
  })
    .sort({ startdate: 1 })
    .limit(limit);
};

// Static method to find events by type
simpleEventSchema.statics.findByType = function (type, limit = 10) {
  return this.find({
    type: new RegExp(type, "i"),
  })
    .sort({ startdate: 1 })
    .limit(limit);
};

// Static method to find events by creator user ID
simpleEventSchema.statics.findByCreator = function (userId, limit = 10) {
  return this.find({
    "creator.userId": userId,
  })
    .sort({ startdate: 1 })
    .limit(limit);
};

// Static method to find events by creator email
simpleEventSchema.statics.findByCreatorEmail = function (email, limit = 10) {
  return this.find({
    "creator.email": email.toLowerCase(),
  })
    .sort({ startdate: 1 })
    .limit(limit);
};

// Static method to find events by creator name (for search)
simpleEventSchema.statics.findByCreatorName = function (name, limit = 10) {
  return this.find({
    "creator.name": new RegExp(name, "i"),
  })
    .sort({ startdate: 1 })
    .limit(limit);
};

const SimpleEvent = mongoose.model("SimpleEvent", simpleEventSchema);

export default SimpleEvent;
