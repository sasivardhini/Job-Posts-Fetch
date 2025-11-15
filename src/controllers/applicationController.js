const { Application, Job } = require('../models');
const { Op } = require('sequelize');

/**
 * Apply to a job
 */
exports.applyToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeUrl,
      coverLetter,
      notes
    } = req.body;

    // Check if job exists and is active
    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This job is no longer accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      where: {
        jobId: id,
        applicantEmail: applicantEmail
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You have already applied to this job',
        data: existingApplication
      });
    }

    // Create application
    const application = await Application.create({
      jobId: id,
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeUrl,
      coverLetter,
      notes,
      status: 'submitted'
    });

    // Fetch full application with job details
    const fullApplication = await Application.findByPk(application.id, {
      include: [{
        model: Job,
        as: 'job'
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: fullApplication
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      message: error.message
    });
  }
};

/**
 * Get all applications with optional filters
 */
exports.getAllApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      email,
      jobId
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (email) where.applicantEmail = email;
    if (jobId) where.jobId = jobId;

    const { count, rows } = await Application.findAndCountAll({
      where,
      include: [{
        model: Job,
        as: 'job'
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        applications: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error.message
    });
  }
};

/**
 * Get a single application by ID
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findByPk(id, {
      include: [{
        model: Job,
        as: 'job'
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application',
      message: error.message
    });
  }
};

/**
 * Get applications by email
 */
exports.getMyApplications = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required'
      });
    }

    const applications = await Application.findAll({
      where: { applicantEmail: email },
      include: [{
        model: Job,
        as: 'job'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error.message
    });
  }
};

/**
 * Update application status
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await Application.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await application.update(updates);

    const updatedApplication = await Application.findByPk(id, {
      include: [{
        model: Job,
        as: 'job'
      }]
    });

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application',
      message: error.message
    });
  }
};

/**
 * Delete an application
 */
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    await application.destroy();

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete application',
      message: error.message
    });
  }
};

/**
 * Get application statistics
 */
exports.getApplicationStats = async (req, res) => {
  try {
    const totalApplications = await Application.count();
    const pendingApplications = await Application.count({ where: { status: 'pending' } });
    const submittedApplications = await Application.count({ where: { status: 'submitted' } });
    const reviewedApplications = await Application.count({ where: { status: 'reviewed' } });
    const interviewApplications = await Application.count({ where: { status: 'interview' } });
    const acceptedApplications = await Application.count({ where: { status: 'accepted' } });
    const rejectedApplications = await Application.count({ where: { status: 'rejected' } });

    res.json({
      success: true,
      data: {
        total: totalApplications,
        pending: pendingApplications,
        submitted: submittedApplications,
        reviewed: reviewedApplications,
        interview: interviewApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications
      }
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application statistics',
      message: error.message
    });
  }
};
