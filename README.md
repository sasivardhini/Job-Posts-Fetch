# Job Posts Fetch API

A complete RESTful API for fetching latest job posts from various sources and managing job applications.

## Features

- Fetch jobs from multiple sources (extensible architecture)
- Store and manage job listings
- Apply to jobs with application tracking
- Filter and search jobs by various criteria
- Track application status
- Statistics and analytics for jobs and applications
- Mock data support for testing

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM for database operations
- **SQLite** - Database (easily switchable to PostgreSQL/MySQL)
- **Axios** - HTTP client for fetching jobs
- **Cheerio** - Web scraping support
- **Express Validator** - Input validation

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Job-Posts-Fetch
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in .env)

## API Documentation

### Base URL
```
http://localhost:3000
```

### Jobs Endpoints

#### 1. Get All Jobs
```http
GET /api/jobs
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `company` (optional) - Filter by company name
- `location` (optional) - Filter by location
- `jobType` (optional) - Filter by job type
- `status` (optional) - Filter by status (default: active)
- `search` (optional) - Search in title, company, or description

**Example:**
```bash
curl "http://localhost:3000/api/jobs?page=1&limit=10&location=Remote"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### 2. Get Latest Jobs
```http
GET /api/jobs/latest
```

**Query Parameters:**
- `limit` (optional) - Number of jobs to fetch (default: 20)

**Example:**
```bash
curl "http://localhost:3000/api/jobs/latest?limit=5"
```

#### 3. Get Job by ID
```http
GET /api/jobs/:id
```

**Example:**
```bash
curl "http://localhost:3000/api/jobs/1"
```

#### 4. Fetch New Jobs
```http
POST /api/jobs/fetch
```

Triggers fetching of new jobs from configured sources.

**Request Body (optional):**
```json
{
  "source": "mock"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/jobs/fetch" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully fetched 5 jobs",
  "data": {
    "success": [...],
    "failed": [],
    "totalFetched": 5
  }
}
```

#### 5. Create Job Manually
```http
POST /api/jobs
```

**Request Body:**
```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "description": "Job description here",
  "location": "San Francisco, CA",
  "salary": "$100,000 - $150,000",
  "jobType": "Full-time",
  "url": "https://example.com/jobs/1",
  "requirements": "Bachelor's degree required",
  "skills": "[\"JavaScript\", \"React\", \"Node.js\"]"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Great opportunity",
    "location": "Remote"
  }'
```

#### 6. Update Job
```http
PUT /api/jobs/:id
```

**Request Body:**
```json
{
  "status": "filled"
}
```

#### 7. Delete Job
```http
DELETE /api/jobs/:id
```

#### 8. Get Job Statistics
```http
GET /api/jobs/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 45,
    "expired": 3,
    "filled": 2,
    "byCompany": [...],
    "byLocation": [...]
  }
}
```

### Application Endpoints

#### 1. Apply to a Job
```http
POST /api/jobs/:id/apply
```

**Request Body:**
```json
{
  "applicantName": "John Doe",
  "applicantEmail": "john@example.com",
  "applicantPhone": "+1234567890",
  "resumeUrl": "https://example.com/resume.pdf",
  "coverLetter": "I am interested in this position...",
  "notes": "Available to start immediately"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/jobs/1/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "John Doe",
    "applicantEmail": "john@example.com",
    "coverLetter": "I am very interested in this role."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": 1,
    "jobId": 1,
    "applicantName": "John Doe",
    "applicantEmail": "john@example.com",
    "status": "submitted",
    "job": {...}
  }
}
```

#### 2. Get All Applications
```http
GET /api/applications
```

**Query Parameters:**
- `page` (optional) - Page number
- `limit` (optional) - Items per page
- `status` (optional) - Filter by status
- `email` (optional) - Filter by applicant email
- `jobId` (optional) - Filter by job ID

**Example:**
```bash
curl "http://localhost:3000/api/applications?status=submitted"
```

#### 3. Get My Applications
```http
GET /api/applications/my-applications?email=john@example.com
```

**Example:**
```bash
curl "http://localhost:3000/api/applications/my-applications?email=john@example.com"
```

#### 4. Get Application by ID
```http
GET /api/applications/:id
```

#### 5. Update Application Status
```http
PATCH /api/applications/:id
```

**Request Body:**
```json
{
  "status": "interview",
  "notes": "Scheduled for interview on Friday"
}
```

**Example:**
```bash
curl -X PATCH "http://localhost:3000/api/applications/1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "interview"
  }'
```

#### 6. Delete Application
```http
DELETE /api/applications/:id
```

#### 7. Get Application Statistics
```http
GET /api/applications/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 10,
    "submitted": 50,
    "reviewed": 20,
    "interview": 10,
    "accepted": 5,
    "rejected": 5
  }
}
```

## Application Status Values

- `pending` - Application created but not yet submitted
- `submitted` - Application has been submitted
- `reviewed` - Application is under review
- `interview` - Candidate scheduled for interview
- `rejected` - Application rejected
- `accepted` - Application accepted

## Job Status Values

- `active` - Job is currently accepting applications
- `expired` - Job posting has expired
- `filled` - Position has been filled

## Job Types

- `Full-time`
- `Part-time`
- `Contract`
- `Internship`
- `Freelance`

## Project Structure

```
Job-Posts-Fetch/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── models/
│   │   ├── Job.js               # Job model
│   │   ├── Application.js       # Application model
│   │   └── index.js             # Model exports
│   ├── controllers/
│   │   ├── jobController.js     # Job business logic
│   │   └── applicationController.js  # Application business logic
│   ├── routes/
│   │   ├── jobRoutes.js         # Job endpoints
│   │   ├── applicationRoutes.js # Application endpoints
│   │   └── applyRoutes.js       # Apply endpoint
│   ├── services/
│   │   └── jobFetchService.js   # Job fetching service
│   ├── middleware/
│   │   ├── validators.js        # Input validation
│   │   └── errorHandler.js      # Error handling
│   └── server.js                # Main application file
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore file
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## Development

### Adding New Job Sources

To add a new job source, edit `src/services/jobFetchService.js`:

```javascript
// Add your source to the sources object
this.sources = {
  mock: this.fetchMockJobs.bind(this),
  yourSource: this.fetchYourSource.bind(this),
};

// Implement the fetch method
async fetchYourSource() {
  // Your implementation here
  // Should return array of job objects
  return jobs;
}
```

### Database Migration

The database schema is automatically created on first run. To switch to PostgreSQL or MySQL:

1. Update `src/config/database.js`
2. Install the appropriate driver (`pg` for PostgreSQL, `mysql2` for MySQL)
3. Update the DATABASE_URL in `.env`

## Testing

### Test the API with cURL

```bash
# Fetch new jobs
curl -X POST http://localhost:3000/api/jobs/fetch

# Get all jobs
curl http://localhost:3000/api/jobs

# Apply to a job
curl -X POST http://localhost:3000/api/jobs/1/apply \
  -H "Content-Type: application/json" \
  -d '{
    "applicantName": "John Doe",
    "applicantEmail": "john@example.com"
  }'

# Get your applications
curl "http://localhost:3000/api/applications/my-applications?email=john@example.com"
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on the GitHub repository.
