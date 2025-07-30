import { body, param, query, validationResult } from 'express-validator';

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Event creation validation
export const validateEventCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),

  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('location.venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required'),

  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('location.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),

  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('category')
    .isIn(['conference', 'workshop', 'webinar', 'networking', 'seminar', 'training', 'other'])
    .withMessage('Category must be one of: conference, workshop, webinar, networking, seminar, training, other'),

  body('organizer.name')
    .trim()
    .notEmpty()
    .withMessage('Organizer name is required'),

  body('organizer.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid organizer email is required'),

  body('organizer.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Phone number must be valid'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Registration deadline must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && new Date(value) > new Date(req.body.startDate)) {
        throw new Error('Registration deadline must be before or equal to start date');
      }
      return true;
    }),

  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be non-negative'),

  body('price.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
    .withMessage('Currency must be one of: USD, EUR, GBP, CAD, AUD'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Status must be one of: draft, published, cancelled, completed'),

  body('isVirtual')
    .optional()
    .isBoolean()
    .withMessage('isVirtual must be a boolean'),

  body('virtualLink')
    .optional()
    .isURL()
    .withMessage('Virtual link must be a valid URL'),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),

  body('attachments.*.filename')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Attachment filename is required'),

  body('attachments.*.url')
    .optional()
    .isURL()
    .withMessage('Attachment URL must be valid'),

  body('attachments.*.type')
    .optional()
    .isIn(['image', 'document', 'video', 'other'])
    .withMessage('Attachment type must be one of: image, document, video, other'),

  handleValidationErrors
];

// Event update validation (similar to creation but with optional fields)
export const validateEventUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('location.venue')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Venue cannot be empty'),

  body('location.address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),

  body('location.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),

  body('location.country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty'),

  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('category')
    .optional()
    .isIn(['conference', 'workshop', 'webinar', 'networking', 'seminar', 'training', 'other'])
    .withMessage('Category must be one of: conference, workshop, webinar, networking, seminar, training, other'),

  body('organizer.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Organizer name cannot be empty'),

  body('organizer.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid organizer email is required'),

  body('organizer.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Phone number must be valid'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Registration deadline must be a valid ISO 8601 date'),

  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be non-negative'),

  body('price.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
    .withMessage('Currency must be one of: USD, EUR, GBP, CAD, AUD'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Status must be one of: draft, published, cancelled, completed'),

  body('isVirtual')
    .optional()
    .isBoolean()
    .withMessage('isVirtual must be a boolean'),

  body('virtualLink')
    .optional()
    .isURL()
    .withMessage('Virtual link must be a valid URL'),

  handleValidationErrors
];

// MongoDB ObjectId validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID format'),
  handleValidationErrors
];

// Status update validation
export const validateStatusUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID format'),
  body('status')
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Status must be one of: draft, published, cancelled, completed'),
  handleValidationErrors
];

// Query parameter validation for event listing
export const validateEventQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Status must be one of: draft, published, cancelled, completed'),

  query('category')
    .optional()
    .isIn(['conference', 'workshop', 'webinar', 'networking', 'seminar', 'training', 'other'])
    .withMessage('Category must be one of: conference, workshop, webinar, networking, seminar, training, other'),

  query('virtual')
    .optional()
    .isBoolean()
    .withMessage('Virtual must be a boolean'),

  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('Upcoming must be a boolean'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  query('sortBy')
    .optional()
    .isIn(['startDate', 'endDate', 'createdAt', 'title', 'registrationCount'])
    .withMessage('SortBy must be one of: startDate, endDate, createdAt, title, registrationCount'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be either asc or desc'),

  handleValidationErrors
];

// Category parameter validation
export const validateCategoryParam = [
  param('category')
    .isIn(['conference', 'workshop', 'webinar', 'networking', 'seminar', 'training', 'other'])
    .withMessage('Category must be one of: conference, workshop, webinar, networking, seminar, training, other'),
  handleValidationErrors
];
