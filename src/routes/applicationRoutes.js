const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validateApplication, validateApplicationUpdate } = require('../middleware/validators');
const cacheService = require('../services/cacheService');

// Get all applications (with filters and pagination) - Cached for 1 minute
router.get('/', cacheService.middleware(60), applicationController.getAllApplications);

// Get my applications by email - Cached for 1 minute
router.get('/my-applications', cacheService.middleware(60), applicationController.getMyApplications);

// Get application statistics - Cached for 5 minutes
router.get('/stats', cacheService.middleware(300), applicationController.getApplicationStats);

// Get a specific application by ID - Cached for 2 minutes
router.get('/:id', cacheService.middleware(120), applicationController.getApplicationById);

// Update application status
router.patch('/:id', validateApplicationUpdate, applicationController.updateApplicationStatus);

// Delete an application
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
