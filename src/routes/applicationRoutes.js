const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validateApplication, validateApplicationUpdate } = require('../middleware/validators');

// Get all applications (with filters and pagination)
router.get('/', applicationController.getAllApplications);

// Get my applications by email
router.get('/my-applications', applicationController.getMyApplications);

// Get application statistics
router.get('/stats', applicationController.getApplicationStats);

// Get a specific application by ID
router.get('/:id', applicationController.getApplicationById);

// Update application status
router.patch('/:id', validateApplicationUpdate, applicationController.updateApplicationStatus);

// Delete an application
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
