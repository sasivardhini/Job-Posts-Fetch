const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Import routes
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const applyRoutes = require('./routes/applyRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Job Posts Fetch API is running',
    timestamp: new Date().toISOString()
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
    message: 'Welcome to Job Posts Fetch API',
    version: '1.0.0',
    endpoints: {
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
    documentation: 'See README.md for detailed API documentation'
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

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   Job Posts Fetch API Server Started      ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: Connected                      ║
╚════════════════════════════════════════════╝

Server is ready to accept requests!
API Documentation: http://localhost:${PORT}/
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
