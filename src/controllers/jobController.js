const { Job, Application } = require('../models');
const jobFetchService = require('../services/jobFetchService');
const { Op } = require('sequelize');

/**
 * Get all jobs with optional filters
 */
exports.getAllJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      company,
      location,
      jobType,
      status = 'active',
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (company) where.company = { [Op.like]: `%${company}%` };
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (jobType) where.jobType = jobType;
    if (status) where.status = status;

    // Search in title, company, or description
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Job.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        jobs: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
};

/**
 * Get a single job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id, {
      include: [{
        model: Application,
        as: 'applications'
      }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job',
      message: error.message
    });
  }
};

/**
 * Trigger fetching new jobs from all sources
 */
exports.fetchJobs = async (req, res) => {
  try {
    const { source } = req.body;

    let result;
    if (source) {
      // Fetch from specific source
      const jobs = await jobFetchService.fetchFromSource(source);
      result = {
        success: [{ source, count: jobs.length, jobs }],
        failed: [],
        totalFetched: jobs.length
      };
    } else {
      // Fetch from all sources
      result = await jobFetchService.fetchAllJobs();
    }

    res.json({
      success: true,
      message: `Successfully fetched ${result.totalFetched} jobs`,
      data: result
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
};

/**
 * Get latest jobs (most recently added)
 */
exports.getLatestJobs = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const jobs = await Job.findAll({
      where: { status: 'active' },
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Error fetching latest jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest jobs',
      message: error.message
    });
  }
};

/**
 * Create a new job manually
 */
exports.createJob = async (req, res) => {
  try {
    const jobData = req.body;

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
      message: error.message
    });
  }
};

/**
 * Update a job
 */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    await job.update(updates);

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
      message: error.message
    });
  }
};

/**
 * Delete a job
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    await job.destroy();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job',
      message: error.message
    });
  }
};

/**
 * Get job statistics
 */
exports.getJobStats = async (req, res) => {
  try {
    const totalJobs = await Job.count();
    const activeJobs = await Job.count({ where: { status: 'active' } });
    const expiredJobs = await Job.count({ where: { status: 'expired' } });
    const filledJobs = await Job.count({ where: { status: 'filled' } });

    // Jobs by company
    const jobsByCompany = await Job.findAll({
      attributes: [
        'company',
        [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count']
      ],
      group: ['company'],
      order: [[Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    // Jobs by location
    const jobsByLocation = await Job.findAll({
      attributes: [
        'location',
        [Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'count']
      ],
      group: ['location'],
      order: [[Job.sequelize.fn('COUNT', Job.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        total: totalJobs,
        active: activeJobs,
        expired: expiredJobs,
        filled: filledJobs,
        byCompany: jobsByCompany,
        byLocation: jobsByLocation
      }
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job statistics',
      message: error.message
    });
  }
};
