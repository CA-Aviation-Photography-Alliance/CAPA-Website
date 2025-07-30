import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return this.startDate <= value;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  location: {
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['conference', 'workshop', 'webinar', 'networking', 'seminar', 'training', 'other'],
    lowercase: true
  },
  organizer: {
    name: {
      type: String,
      required: [true, 'Organizer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Organizer email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true
    }
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10,000']
  },
  registrationDeadline: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= this.startDate;
      },
      message: 'Registration deadline must be before or equal to start date'
    }
  },
  price: {
    amount: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft',
    lowercase: true
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  virtualLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (this.isVirtual && !value) {
          return false;
        }
        if (value && !this.isVirtual) {
          return false;
        }
        return true;
      },
      message: 'Virtual link is required for virtual events and should not be provided for physical events'
    }
  },
  registrationCount: {
    type: Number,
    default: 0,
    min: [0, 'Registration count cannot be negative']
  },
  attachments: [{
    filename: String,
    url: String,
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'other']
    }
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for event duration in hours
eventSchema.virtual('durationHours').get(function() {
  return Math.round((this.endDate - this.startDate) / (1000 * 60 * 60) * 100) / 100;
});

// Virtual field to check if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  const deadline = this.registrationDeadline || this.startDate;
  return this.status === 'published' && now < deadline;
});

// Virtual field to check if event is upcoming
eventSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.startDate;
});

// Virtual field to check if registration is full
eventSchema.virtual('isFull').get(function() {
  return this.capacity && this.registrationCount >= this.capacity;
});

// Index for efficient queries
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ 'location.city': 1, 'location.country': 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });

// Pre-save middleware to validate virtual events
eventSchema.pre('save', function(next) {
  if (this.isVirtual && !this.virtualLink) {
    next(new Error('Virtual link is required for virtual events'));
  } else if (!this.isVirtual && this.virtualLink) {
    this.virtualLink = undefined;
  }
  next();
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    startDate: { $gte: new Date() },
    status: 'published'
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

// Static method to find events by category
eventSchema.statics.findByCategory = function(category, limit = 10) {
  return this.find({
    category: category.toLowerCase(),
    status: 'published'
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

// Instance method to check if user can register
eventSchema.methods.canRegister = function() {
  return this.isRegistrationOpen && !this.isFull;
};

const Event = mongoose.model('Event', eventSchema);

export default Event;
