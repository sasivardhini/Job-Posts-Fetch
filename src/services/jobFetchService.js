const axios = require('axios');
const cheerio = require('cheerio');
const { Job } = require('../models');

class JobFetchService {
  constructor() {
    this.sources = {
      mock: this.fetchMockJobs.bind(this),
      // Add more sources here as needed
      // github: this.fetchGithubJobs.bind(this),
      // stackoverflow: this.fetchStackOverflowJobs.bind(this),
    };
  }

  /**
   * Fetch jobs from all configured sources
   */
  async fetchAllJobs() {
    const results = {
      success: [],
      failed: [],
      totalFetched: 0
    };

    for (const [sourceName, fetchFunction] of Object.entries(this.sources)) {
      try {
        console.log(`Fetching jobs from ${sourceName}...`);
        const jobs = await fetchFunction();

        // Save jobs to database
        const savedJobs = await this.saveJobs(jobs, sourceName);

        results.success.push({
          source: sourceName,
          count: savedJobs.length,
          jobs: savedJobs
        });
        results.totalFetched += savedJobs.length;
      } catch (error) {
        console.error(`Error fetching from ${sourceName}:`, error.message);
        results.failed.push({
          source: sourceName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Fetch jobs from a specific source
   */
  async fetchFromSource(sourceName) {
    if (!this.sources[sourceName]) {
      throw new Error(`Unknown source: ${sourceName}`);
    }

    const jobs = await this.sources[sourceName]();
    return await this.saveJobs(jobs, sourceName);
  }

  /**
   * Save jobs to database (avoiding duplicates)
   */
  async saveJobs(jobs, source) {
    const savedJobs = [];

    for (const jobData of jobs) {
      try {
        // Check if job already exists (by title, company, and source)
        const existingJob = await Job.findOne({
          where: {
            title: jobData.title,
            company: jobData.company,
            source: source
          }
        });

        if (!existingJob) {
          const job = await Job.create({
            ...jobData,
            source: source
          });
          savedJobs.push(job);
        } else {
          // Update existing job
          await existingJob.update(jobData);
          savedJobs.push(existingJob);
        }
      } catch (error) {
        console.error(`Error saving job "${jobData.title}":`, error.message);
      }
    }

    return savedJobs;
  }

  /**
   * Mock job fetcher for testing and demonstration
   */
  async fetchMockJobs() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return [
      {
        title: 'Senior Full Stack Developer',
        company: 'Tech Corp',
        description: 'We are looking for an experienced Full Stack Developer to join our team. You will work on cutting-edge technologies and build scalable applications.',
        location: 'San Francisco, CA',
        salary: '$120,000 - $160,000',
        jobType: 'Full-time',
        url: 'https://example.com/jobs/1',
        postedDate: new Date(),
        requirements: 'Bachelor\'s degree in Computer Science or related field, 5+ years of experience',
        skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'AWS']),
        status: 'active'
      },
      {
        title: 'Frontend Developer',
        company: 'Startup Inc',
        description: 'Join our fast-paced startup and help build amazing user experiences.',
        location: 'Remote',
        salary: '$90,000 - $130,000',
        jobType: 'Full-time',
        url: 'https://example.com/jobs/2',
        postedDate: new Date(),
        requirements: '3+ years of frontend development experience',
        skills: JSON.stringify(['React', 'TypeScript', 'CSS', 'HTML']),
        status: 'active'
      },
      {
        title: 'DevOps Engineer',
        company: 'Cloud Solutions LLC',
        description: 'Seeking a DevOps engineer to manage our cloud infrastructure and CI/CD pipelines.',
        location: 'New York, NY',
        salary: '$110,000 - $150,000',
        jobType: 'Full-time',
        url: 'https://example.com/jobs/3',
        postedDate: new Date(),
        requirements: 'Experience with AWS, Docker, Kubernetes',
        skills: JSON.stringify(['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform']),
        status: 'active'
      },
      {
        title: 'Data Scientist',
        company: 'Analytics Pro',
        description: 'Work with large datasets and build machine learning models to drive business insights.',
        location: 'Boston, MA',
        salary: '$100,000 - $140,000',
        jobType: 'Full-time',
        url: 'https://example.com/jobs/4',
        postedDate: new Date(),
        requirements: 'PhD or Master\'s in Statistics, Computer Science, or related field',
        skills: JSON.stringify(['Python', 'R', 'SQL', 'Machine Learning', 'TensorFlow']),
        status: 'active'
      },
      {
        title: 'Backend Developer',
        company: 'Enterprise Systems',
        description: 'Develop and maintain robust backend services for enterprise applications.',
        location: 'Austin, TX',
        salary: '$95,000 - $135,000',
        jobType: 'Full-time',
        url: 'https://example.com/jobs/5',
        postedDate: new Date(),
        requirements: '4+ years of backend development experience',
        skills: JSON.stringify(['Java', 'Spring Boot', 'MySQL', 'Redis', 'Microservices']),
        status: 'active'
      }
    ];
  }

  /**
   * Example: Fetch jobs from a custom API endpoint
   * This is a template that can be customized for real job boards
   */
  async fetchFromAPI(apiUrl) {
    try {
      const response = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'JobFetchBot/1.0'
        }
      });

      // Parse response and return jobs in standard format
      // This will vary based on the API structure
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch from API: ${error.message}`);
    }
  }

  /**
   * Example: Scrape jobs from a website
   * This is a template that can be customized for real job boards
   */
  async scrapeWebsite(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // Example scraping logic (customize based on website structure)
      // $('.job-listing').each((i, element) => {
      //   jobs.push({
      //     title: $(element).find('.job-title').text(),
      //     company: $(element).find('.company-name').text(),
      //     location: $(element).find('.location').text(),
      //     // ... more fields
      //   });
      // });

      return jobs;
    } catch (error) {
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }
}

module.exports = new JobFetchService();
