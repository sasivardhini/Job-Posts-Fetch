const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Validation for job creation
exports.validateJobCreation = [
  body('title')
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('company')
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  body('salary')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary must not exceed 100 characters'),
  body('jobType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'])
    .withMessage('Invalid job type'),
  body('url')
    .optional()
    .isURL()
    .withMessage('Invalid URL format'),
  body('status')
    .optional()
    .isIn(['active', 'expired', 'filled'])
    .withMessage('Invalid status'),
  handleValidationErrors
];

// Validation for job update
exports.validateJobUpdate = [
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('company')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  body('salary')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary must not exceed 100 characters'),
  body('jobType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'])
    .withMessage('Invalid job type'),
  body('url')
    .optional()
    .isURL()
    .withMessage('Invalid URL format'),
  body('status')
    .optional()
    .isIn(['active', 'expired', 'filled'])
    .withMessage('Invalid status'),
  handleValidationErrors
];

// Validation for job application
exports.validateApplication = [
  body('applicantName')
    .notEmpty()
    .withMessage('Applicant name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('applicantEmail')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('applicantPhone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('resumeUrl')
    .optional()
    .isURL()
    .withMessage('Invalid resume URL format'),
  body('coverLetter')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Cover letter must not exceed 2000 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  handleValidationErrors
];

// Validation for application update
exports.validateApplicationUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'submitted', 'reviewed', 'interview', 'rejected', 'accepted'])
    .withMessage('Invalid application status'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  handleValidationErrors
];
