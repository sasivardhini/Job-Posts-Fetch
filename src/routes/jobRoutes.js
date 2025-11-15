const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { validateJobCreation, validateJobUpdate } = require('../middleware/validators');
const { fetchLimiter } = require('../middleware/rateLimiter');
const cacheService = require('../services/cacheService');

// Get all jobs (with filters and pagination) - Cached for 2 minutes
router.get('/', cacheService.middleware(120), jobController.getAllJobs);

// Get latest jobs - Cached for 1 minute
router.get('/latest', cacheService.middleware(60), jobController.getLatestJobs);

// Get job statistics - Cached for 5 minutes
router.get('/stats', cacheService.middleware(300), jobController.getJobStats);

// Fetch new jobs from sources - Rate limited to prevent abuse
router.post('/fetch', fetchLimiter, jobController.fetchJobs);

// Get a specific job by ID - Cached for 5 minutes
router.get('/:id', cacheService.middleware(300), jobController.getJobById);

// Create a new job manually
router.post('/', validateJobCreation, jobController.createJob);

// Update a job
router.put('/:id', validateJobUpdate, jobController.updateJob);

// Delete a job
router.delete('/:id', jobController.deleteJob);

module.exports = router;
