const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Posts Fetch API',
      version: '1.0.0',
      description: 'A complete API for fetching latest job posts and managing job applications',
      contact: {
        name: 'API Support'
      },
      license: {
        name: 'ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://your-production-url.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Jobs',
        description: 'Job management endpoints'
      },
      {
        name: 'Applications',
        description: 'Application management endpoints'
      },
      {
        name: 'System',
        description: 'System and health check endpoints'
      }
    ],
    components: {
      schemas: {
        Job: {
          type: 'object',
          required: ['title', 'company'],
          properties: {
            id: {
              type: 'integer',
              description: 'Job ID'
            },
            title: {
              type: 'string',
              description: 'Job title',
              example: 'Senior Full Stack Developer'
            },
            company: {
              type: 'string',
              description: 'Company name',
              example: 'Tech Corp'
            },
            description: {
              type: 'string',
              description: 'Job description'
            },
            location: {
              type: 'string',
              description: 'Job location',
              example: 'San Francisco, CA'
            },
            salary: {
              type: 'string',
              description: 'Salary range',
              example: '$120,000 - $160,000'
            },
            jobType: {
              type: 'string',
              enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
              description: 'Type of employment'
            },
            source: {
              type: 'string',
              description: 'Source from where job was fetched'
            },
            url: {
              type: 'string',
              description: 'Job posting URL'
            },
            postedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date job was posted'
            },
            requirements: {
              type: 'string',
              description: 'Job requirements'
            },
            skills: {
              type: 'string',
              description: 'Required skills (JSON array string)'
            },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'filled'],
              description: 'Job status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Application: {
          type: 'object',
          required: ['applicantName', 'applicantEmail'],
          properties: {
            id: {
              type: 'integer',
              description: 'Application ID'
            },
            jobId: {
              type: 'integer',
              description: 'ID of the job being applied to'
            },
            applicantName: {
              type: 'string',
              description: 'Applicant full name',
              example: 'John Doe'
            },
            applicantEmail: {
              type: 'string',
              format: 'email',
              description: 'Applicant email address',
              example: 'john@example.com'
            },
            applicantPhone: {
              type: 'string',
              description: 'Applicant phone number',
              example: '+1234567890'
            },
            resumeUrl: {
              type: 'string',
              description: 'URL to resume file'
            },
            coverLetter: {
              type: 'string',
              description: 'Cover letter text'
            },
            status: {
              type: 'string',
              enum: ['pending', 'submitted', 'reviewed', 'interview', 'rejected', 'accepted'],
              description: 'Application status'
            },
            notes: {
              type: 'string',
              description: 'Additional notes'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
