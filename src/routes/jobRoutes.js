const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { validateJobCreation, validateJobUpdate } = require('../middleware/validators');

// Get all jobs (with filters and pagination)
router.get('/', jobController.getAllJobs);

// Get latest jobs
router.get('/latest', jobController.getLatestJobs);

// Get job statistics
router.get('/stats', jobController.getJobStats);

// Fetch new jobs from sources
router.post('/fetch', jobController.fetchJobs);

// Get a specific job by ID
router.get('/:id', jobController.getJobById);

// Create a new job manually
router.post('/', validateJobCreation, jobController.createJob);

// Update a job
router.put('/:id', validateJobUpdate, jobController.updateJob);

// Delete a job
router.delete('/:id', jobController.deleteJob);

module.exports = router;
