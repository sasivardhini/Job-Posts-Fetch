const axios = require('axios');
const cheerio = require('cheerio');
const { Job } = require('../models');

class JobFetchService {
  constructor() {
    this.sources = {
      remoteok: this.fetchRemoteOKJobs.bind(this),
      weworkremotely: this.fetchWeWorkRemotelyJobs.bind(this),
      remotive: this.fetchRemotiveJobs.bind(this),
      // LinkedIn and Indeed require browser automation (Puppeteer)
      // linkedin: this.fetchLinkedInJobs.bind(this),
      // indeed: this.fetchIndeedJobs.bind(this),
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
   * Fetch jobs from RemoteOK (JSON API)
   * RemoteOK provides a public JSON API for job listings
   */
  async fetchRemoteOKJobs() {
    try {
      console.log('Fetching jobs from RemoteOK...');

      const response = await axios.get('https://remoteok.com/api', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.log('No jobs returned from RemoteOK');
        return [];
      }

      // RemoteOK returns an array with first element being metadata, skip it
      const jobData = response.data.slice(1, 21); // Get 20 jobs

      const jobs = jobData
        .filter(job => job && job.position) // Filter out invalid entries
        .map(job => ({
          title: job.position || 'No Title',
          company: job.company || 'Unknown Company',
          description: job.description || `${job.position} at ${job.company}`,
          location: job.location || 'Remote',
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min} - $${job.salary_max}`
            : 'Not specified',
          jobType: job.employment_type || 'Full-time',
          url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
          postedDate: job.date ? new Date(job.date) : new Date(),
          requirements: this.extractRequirements(job.description),
          skills: JSON.stringify(job.tags || []),
          status: 'active'
        }));

      console.log(`Successfully fetched ${jobs.length} jobs from RemoteOK`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from RemoteOK:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from WeWorkRemotely (Web Scraping)
   * Scrapes job listings from WeWorkRemotely
   */
  async fetchWeWorkRemotelyJobs() {
    try {
      console.log('Fetching jobs from WeWorkRemotely...');

      const response = await axios.get('https://weworkremotely.com/remote-jobs/search?term=developer', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // WeWorkRemotely job listings
      $('li.feature, li:not(.feature)').each((index, element) => {
        if (index >= 20) return false; // Limit to 20 jobs

        const $job = $(element);
        const $link = $job.find('a[href^="/remote-jobs/"]').first();

        if (!$link.length) return; // Skip if no job link

        const title = $link.find('.title').text().trim() ||
                     $link.find('span.company').next().text().trim();
        const company = $link.find('.company').text().trim();
        const region = $link.find('.region').text().trim();
        const jobUrl = $link.attr('href');

        if (title && company) {
          jobs.push({
            title: title,
            company: company,
            description: `${title} position at ${company}. Remote work opportunity.`,
            location: region || 'Remote',
            salary: 'Not specified',
            jobType: 'Full-time',
            url: jobUrl ? `https://weworkremotely.com${jobUrl}` : '',
            postedDate: new Date(),
            requirements: 'See job posting for details',
            skills: JSON.stringify(['Remote Work', 'Developer']),
            status: 'active'
          });
        }
      });

      console.log(`Successfully scraped ${jobs.length} jobs from WeWorkRemotely`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from WeWorkRemotely:', error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from LinkedIn (Web Scraping)
   * NOTE: LinkedIn blocks simple scraping - requires Puppeteer/Selenium
   */
  async fetchLinkedInJobs() {
    try {
      const searchKeywords = process.env.LINKEDIN_SEARCH_KEYWORDS || 'software developer';
      const location = process.env.LINKEDIN_LOCATION || 'United States';

      // LinkedIn's public job search URL
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchKeywords)}&location=${encodeURIComponent(location)}&f_TPR=r86400`; // last 24 hours

      console.log(`Fetching jobs from LinkedIn: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // LinkedIn job card selectors (may need updates if LinkedIn changes their HTML)
      $('.base-card').each((index, element) => {
        if (index >= 20) return false; // Limit to 20 jobs

        const $card = $(element);

        const title = $card.find('.base-search-card__title').text().trim() ||
                     $card.find('h3').text().trim();
        const company = $card.find('.base-search-card__subtitle').text().trim() ||
                       $card.find('h4').text().trim();
        const location = $card.find('.job-search-card__location').text().trim();
        const jobUrl = $card.find('a').attr('href');
        const datePosted = $card.find('time').attr('datetime');

        if (title && company) {
          jobs.push({
            title: title,
            company: company,
            description: `${title} position at ${company}. View full details on LinkedIn.`,
            location: location || 'Not specified',
            salary: 'Not specified',
            jobType: 'Full-time',
            url: jobUrl || '',
            postedDate: datePosted ? new Date(datePosted) : new Date(),
            requirements: 'See LinkedIn posting for requirements',
            skills: JSON.stringify([searchKeywords]),
            status: 'active'
          });
        }
      });

      console.log(`Successfully scraped ${jobs.length} jobs from LinkedIn`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from LinkedIn:', error.message);
      console.log('Note: LinkedIn may block scraping attempts. Consider using LinkedIn API or other sources.');

      // Return empty array instead of throwing to allow other sources to continue
      return [];
    }
  }

  /**
   * Fetch jobs from Indeed (Web Scraping)
   * Scrapes public Indeed job search results
   */
  async fetchIndeedJobs() {
    try {
      const searchKeywords = process.env.INDEED_SEARCH_KEYWORDS || 'software developer';
      const location = process.env.INDEED_LOCATION || 'United States';

      // Indeed's public job search URL
      const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchKeywords)}&l=${encodeURIComponent(location)}&sort=date`;

      console.log(`Fetching jobs from Indeed: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.indeed.com/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // Indeed job card selectors
      $('.job_seen_beacon, .cardOutline, .jobsearch-ResultsList > li').each((index, element) => {
        if (index >= 20) return false; // Limit to 20 jobs

        const $card = $(element);

        // Try multiple selectors as Indeed's HTML structure varies
        const title = $card.find('h2.jobTitle span[title]').attr('title') ||
                     $card.find('h2.jobTitle').text().trim() ||
                     $card.find('.jobTitle').text().trim();

        const company = $card.find('[data-testid="company-name"]').text().trim() ||
                       $card.find('.companyName').text().trim();

        const location = $card.find('[data-testid="text-location"]').text().trim() ||
                        $card.find('.companyLocation').text().trim();

        const salaryText = $card.find('.salary-snippet').text().trim() ||
                          $card.find('.metadata.salary-snippet-container').text().trim();

        const jobLink = $card.find('h2.jobTitle a').attr('href') ||
                       $card.find('a[data-jk]').attr('href');

        const jobUrl = jobLink ? `https://www.indeed.com${jobLink}` : '';

        const snippet = $card.find('.job-snippet').text().trim() ||
                       $card.find('.summary').text().trim();

        if (title && company) {
          jobs.push({
            title: title,
            company: company,
            description: snippet || `${title} position at ${company}. View full details on Indeed.`,
            location: location || 'Not specified',
            salary: salaryText || 'Not specified',
            jobType: 'Full-time',
            url: jobUrl,
            postedDate: new Date(),
            requirements: snippet || 'See Indeed posting for requirements',
            skills: JSON.stringify([searchKeywords]),
            status: 'active'
          });
        }
      });

      console.log(`Successfully scraped ${jobs.length} jobs from Indeed`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from Indeed:', error.message);
      console.log('Note: Indeed may block scraping attempts. Consider rotating user agents or adding delays.');

      // Return empty array instead of throwing to allow other sources to continue
      return [];
    }
  }

  /**
   * Fetch jobs from Remotive.io API (Remote jobs)
   * API Documentation: https://remotive.com/api
   */
  async fetchRemotiveJobs() {
    try {
      const response = await axios.get('https://remotive.com/api/remote-jobs', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (!response.data || !response.data.jobs) {
        console.log('No jobs returned from Remotive API');
        return [];
      }

      // Map Remotive jobs to our format
      const jobs = response.data.jobs.slice(0, 20).map(job => ({
        title: job.title || 'No Title',
        company: job.company_name || 'Unknown Company',
        description: job.description || 'No description available',
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || 'Not specified',
        jobType: job.job_type || 'Full-time',
        url: job.url || '',
        postedDate: job.publication_date ? new Date(job.publication_date) : new Date(),
        requirements: this.extractRequirements(job.description),
        skills: JSON.stringify(job.tags || []),
        status: 'active'
      }));

      console.log(`Successfully fetched ${jobs.length} jobs from Remotive`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from Remotive:', error.message);
      throw new Error(`Remotive API error: ${error.message}`);
    }
  }

  /**
   * Fetch jobs from Adzuna API
   * Requires ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables
   * Sign up at: https://developer.adzuna.com/
   */
  async fetchAdzunaJobs() {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    // Skip if credentials not configured
    if (!appId || !appKey) {
      console.log('Adzuna API credentials not configured. Skipping...');
      console.log('Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env to enable Adzuna jobs');
      return [];
    }

    try {
      // Search for software developer jobs in the US
      const response = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/us/search/1`,
        {
          params: {
            app_id: appId,
            app_key: appKey,
            results_per_page: 20,
            what: 'software developer'
          },
          timeout: 15000
        }
      );

      if (!response.data || !response.data.results) {
        console.log('No jobs returned from Adzuna API');
        return [];
      }

      // Map Adzuna jobs to our format
      const jobs = response.data.results.map(job => ({
        title: job.title || 'No Title',
        company: job.company?.display_name || 'Unknown Company',
        description: job.description || 'No description available',
        location: job.location?.display_name || 'Not specified',
        salary: job.salary_min && job.salary_max
          ? `$${Math.round(job.salary_min)} - $${Math.round(job.salary_max)}`
          : 'Not specified',
        jobType: job.contract_time || 'Full-time',
        url: job.redirect_url || '',
        postedDate: job.created ? new Date(job.created) : new Date(),
        requirements: this.extractRequirements(job.description),
        skills: JSON.stringify([job.category?.label || 'General'].filter(Boolean)),
        status: 'active'
      }));

      console.log(`Successfully fetched ${jobs.length} jobs from Adzuna`);
      return jobs;
    } catch (error) {
      console.error('Error fetching from Adzuna:', error.message);
      // Don't throw error, just return empty array to allow other sources to continue
      return [];
    }
  }

  /**
   * Extract requirements from job description
   */
  extractRequirements(description) {
    if (!description) return 'See job description';

    // Simple extraction: look for requirements section
    const reqMatch = description.match(/requirements?:?\s*(.{0,500})/i);
    if (reqMatch && reqMatch[1]) {
      return reqMatch[1].substring(0, 500).trim();
    }

    // Fallback: return first 200 characters
    return description.substring(0, 200).replace(/<[^>]*>/g, '').trim() + '...';
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
