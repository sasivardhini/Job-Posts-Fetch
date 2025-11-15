const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validateApplication } = require('../middleware/validators');
const { applicationLimiter } = require('../middleware/rateLimiter');

// Apply to a job - Rate limited to prevent spam
router.post('/:id/apply', applicationLimiter, validateApplication, applicationController.applyToJob);

module.exports = router;
