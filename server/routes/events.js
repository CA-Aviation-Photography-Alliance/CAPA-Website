import express from 'express';
import Event from '../models/Event.js';

const router = express.Router();

// GET /api/events - Get all events with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      city,
      country,
      upcoming,
      virtual,
      search,
      startDate,
      endDate,
      sortBy = 'startDate',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status.toLowerCase();
    if (category) filter.category = category.toLowerCase();
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (country) filter['location.country'] = new RegExp(country, 'i');
    if (virtual !== undefined) filter.isVirtual = virtual === 'true';

    // Filter for upcoming events
    if (upcoming === 'true') {
      filter.startDate = { $gte: new Date() };
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
        { 'organizer.name': new RegExp(search, 'i') }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const events = await Event.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Event.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

// GET /api/events/upcoming - Get upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const events = await Event.findUpcoming(parseInt(limit));

    res.json({
      success: true,
      data: events,
      count: events.length
    });

  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events',
      message: error.message
    });
  }
});

// GET /api/events/categories/:category - Get events by category
router.get('/categories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const events = await Event.findByCategory(category, parseInt(limit));

    res.json({
      success: true,
      data: events,
      category: category.toLowerCase(),
      count: events.length
    });

  } catch (error) {
    console.error('Error fetching events by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events by category',
      message: error.message
    });
  }
});

// GET /api/events/stats - Get event statistics
router.get('/stats', async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const publishedEvents = await Event.countDocuments({ status: 'published' });
    const upcomingEvents = await Event.countDocuments({
      startDate: { $gte: new Date() },
      status: 'published'
    });
    const virtualEvents = await Event.countDocuments({ isVirtual: true });

    // Get events by category
    const categoryStats = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get events by month for the current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await Event.aggregate([
      {
        $match: {
          startDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$startDate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalEvents,
          publishedEvents,
          upcomingEvents,
          virtualEvents
        },
        categories: categoryStats,
        monthly: monthlyStats
      }
    });

  } catch (error) {
    console.error('Error fetching event statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event statistics',
      message: error.message
    });
  }
});

// GET /api/events/:id - Get a specific event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).select('-__v');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Error fetching event:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

// POST /api/events - Create a new event
router.post('/', async (req, res) => {
  try {
    const eventData = req.body;

    // Create new event
    const event = new Event(eventData);
    const savedEvent = await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: savedEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

// PUT /api/events/:id - Update an event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Event.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        select: '-__v'
      }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });

  } catch (error) {
    console.error('Error updating event:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

// PATCH /api/events/:id/status - Update event status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'published', 'cancelled', 'completed'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: draft, published, cancelled, completed'
      });
    }

    const event = await Event.findByIdAndUpdate(
      id,
      { status: status.toLowerCase() },
      { new: true, select: '-__v' }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: `Event status updated to ${status.toLowerCase()}`,
      data: event
    });

  } catch (error) {
    console.error('Error updating event status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update event status',
      message: error.message
    });
  }
});

// PATCH /api/events/:id/register - Register for an event (increment registration count)
router.patch('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (!event.canRegister()) {
      return res.status(400).json({
        success: false,
        error: 'Registration is not available for this event',
        details: {
          isRegistrationOpen: event.isRegistrationOpen,
          isFull: event.isFull,
          capacity: event.capacity,
          currentRegistrations: event.registrationCount
        }
      });
    }

    event.registrationCount += 1;
    await event.save();

    res.json({
      success: true,
      message: 'Registration successful',
      data: {
        eventId: event._id,
        registrationCount: event.registrationCount,
        capacity: event.capacity,
        spotsRemaining: event.capacity ? event.capacity - event.registrationCount : null
      }
    });

  } catch (error) {
    console.error('Error registering for event:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to register for event',
      message: error.message
    });
  }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
      data: {
        deletedEvent: {
          id: event._id,
          title: event.title
        }
      }
    });

  } catch (error) {
    console.error('Error deleting event:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

export default router;
