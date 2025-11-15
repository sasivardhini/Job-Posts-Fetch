const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { validateApplication } = require('../middleware/validators');

// Apply to a job
router.post('/:id/apply', validateApplication, applicationController.applyToJob);

module.exports = router;
