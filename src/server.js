const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { connectDB } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const cacheService = require('./services/cacheService');
const scheduledJobFetcher = require('./services/scheduledJobFetcher');
const swaggerSpec = require('./config/swagger');

// Load environment variables
dotenv.config();

// Import routes
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const applyRoutes = require('./routes/applyRoutes');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// Compression middleware for responses
app.use(compression());

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (Morgan)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting middleware (applied globally)
app.use(generalLimiter);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Job Posts Fetch API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Job Posts Fetch API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json({
    success: true,
    data: cacheService.getStats()
  });
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// Scheduled job status endpoint
app.get('/api/scheduler/status', (req, res) => {
  res.json({
    success: true,
    data: scheduledJobFetcher.getStatus()
  });
});

// API routes
app.use('/api/jobs', jobRoutes);
app.use('/api/jobs', applyRoutes);  // Apply routes (e.g., /api/jobs/:id/apply)
app.use('/api/applications', applicationRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Job Posts Fetch API - Advanced Edition',
    version: '2.0.0',
    features: [
      'In-memory caching for improved performance',
      'Rate limiting for API protection',
      'Automatic job fetching with scheduler',
      'Interactive Swagger API documentation',
      'Security headers with Helmet',
      'Response compression',
      'Request logging'
    ],
    endpoints: {
      documentation: {
        'GET /api-docs': 'Interactive Swagger API documentation'
      },
      system: {
        'GET /health': 'Health check and system stats',
        'GET /api/cache/stats': 'Cache statistics',
        'POST /api/cache/clear': 'Clear cache',
        'GET /api/scheduler/status': 'Scheduled jobs status'
      },
      jobs: {
        'GET /api/jobs': 'Get all jobs (with filters)',
        'GET /api/jobs/latest': 'Get latest jobs',
        'GET /api/jobs/stats': 'Get job statistics',
        'GET /api/jobs/:id': 'Get job by ID',
        'POST /api/jobs': 'Create a job manually',
        'POST /api/jobs/fetch': 'Fetch new jobs from sources',
        'PUT /api/jobs/:id': 'Update a job',
        'DELETE /api/jobs/:id': 'Delete a job',
        'POST /api/jobs/:id/apply': 'Apply to a job'
      },
      applications: {
        'GET /api/applications': 'Get all applications (with filters)',
        'GET /api/applications/my-applications': 'Get my applications by email',
        'GET /api/applications/stats': 'Get application statistics',
        'GET /api/applications/:id': 'Get application by ID',
        'PATCH /api/applications/:id': 'Update application status',
        'DELETE /api/applications/:id': 'Delete an application'
      }
    },
    links: {
      swagger: `http://localhost:${process.env.PORT || 3000}/api-docs`,
      github: 'https://github.com/your-repo',
      documentation: 'See README.md for detailed information'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start scheduled job fetcher
    scheduledJobFetcher.start();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║   Job Posts Fetch API - Advanced Edition         ║
╠═══════════════════════════════════════════════════╣
║   Version: 2.0.0                                  ║
║   Port: ${PORT}                                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}                         ║
║   Database: Connected                             ║
║   Cache: Enabled (In-Memory)                      ║
║   Rate Limiting: Enabled                          ║
║   Scheduler: ${scheduledJobFetcher.isEnabled ? 'Enabled' : 'Disabled'}                            ║
╚═══════════════════════════════════════════════════╝

🚀 Server is ready to accept requests!

📚 API Documentation: http://localhost:${PORT}/api-docs
🏥 Health Check: http://localhost:${PORT}/health
📊 Cache Stats: http://localhost:${PORT}/api/cache/stats

Features:
  ✓ In-memory caching for improved performance
  ✓ Rate limiting for API protection
  ✓ Swagger/OpenAPI documentation
  ✓ Security headers with Helmet
  ✓ Response compression
  ✓ Request logging with Morgan
  ${scheduledJobFetcher.isEnabled ? '✓ Automatic job fetching (hourly)' : '✗ Automatic job fetching (disabled)'}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
