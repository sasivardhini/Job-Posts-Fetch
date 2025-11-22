/**
 * Puppeteer-based Job Scraper
 * Uses browser automation for sites with anti-bot protection
 */

const puppeteer = require('puppeteer');
const {
  getPuppeteerConfig,
  setupPuppeteerPage,
  getPuppeteerProxyFromEnv,
  randomDelay,
  retryWithBackoff,
} = require('../utils/scraperUtils');

class PuppeteerScraper {
  constructor() {
    this.browser = null;
    this.proxy = getPuppeteerProxyFromEnv();
  }

  /**
   * Initialize browser instance
   */
  async init() {
    if (!this.browser) {
      const config = getPuppeteerConfig({ proxy: this.proxy });
      this.browser = await puppeteer.launch(config);
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Fetch LinkedIn jobs using Puppeteer
   */
  async fetchLinkedInJobs() {
    const searchKeywords = process.env.LINKEDIN_SEARCH_KEYWORDS || 'software developer';
    const location = process.env.LINKEDIN_LOCATION || 'United States';

    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchKeywords)}&location=${encodeURIComponent(location)}&f_TPR=r86400`;

    console.log(`[Puppeteer] Fetching jobs from LinkedIn: ${searchUrl}`);

    return await retryWithBackoff(async () => {
      await this.init();
      const page = await this.browser.newPage();

      try {
        await setupPuppeteerPage(page, { proxy: this.proxy });

        // Navigate to LinkedIn jobs
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Wait for job listings to load
        await randomDelay(2000, 4000);

        // Try multiple selectors as LinkedIn's DOM changes frequently
        const jobs = await page.evaluate(() => {
          const results = [];

          // Try primary selector
          let jobCards = document.querySelectorAll('li.job-search-card, .jobs-search__results-list li, .scaffold-layout__list-container li');

          // Fallback to any list item with job info
          if (jobCards.length === 0) {
            jobCards = document.querySelectorAll('[data-job-id]');
          }

          jobCards.forEach((card, index) => {
            if (index >= 25) return; // Limit to 25 jobs per page

            try {
              // Extract job details with multiple fallback selectors
              const titleEl = card.querySelector('h3.base-search-card__title, .job-search-card__title, h3');
              const companyEl = card.querySelector('h4.base-search-card__subtitle, .job-search-card__company-name, h4');
              const locationEl = card.querySelector('.job-search-card__location, .base-search-card__metadata span');
              const linkEl = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');
              const timeEl = card.querySelector('time, .job-search-card__listdate');

              if (!titleEl || !companyEl) return;

              const title = titleEl.textContent.trim();
              const company = companyEl.textContent.trim();
              const location = locationEl ? locationEl.textContent.trim() : 'Remote';
              const url = linkEl ? linkEl.href : '';
              const postedDate = timeEl ? timeEl.getAttribute('datetime') || timeEl.textContent : null;

              // Extract job ID from URL or data attribute
              const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/);
              const jobId = jobIdMatch ? jobIdMatch[1] : card.getAttribute('data-job-id');

              results.push({
                title,
                company,
                location,
                url: url || `https://www.linkedin.com/jobs/view/${jobId}`,
                postedDate,
                description: '', // Will be filled in detail page
                jobType: 'Full-time',
                salary: null,
                requirements: '',
                skills: [],
              });
            } catch (err) {
              console.error('Error parsing job card:', err.message);
            }
          });

          return results;
        });

        console.log(`[Puppeteer] Found ${jobs.length} LinkedIn jobs`);
        return jobs;

      } finally {
        await page.close();
      }
    }, 2, 2000);
  }

  /**
   * Fetch Indeed jobs using Puppeteer
   */
  async fetchIndeedJobs() {
    const searchKeywords = process.env.INDEED_SEARCH_KEYWORDS || 'software developer';
    const location = process.env.INDEED_LOCATION || 'United States';

    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchKeywords)}&l=${encodeURIComponent(location)}&sort=date`;

    console.log(`[Puppeteer] Fetching jobs from Indeed: ${searchUrl}`);

    return await retryWithBackoff(async () => {
      await this.init();
      const page = await this.browser.newPage();

      try {
        await setupPuppeteerPage(page, { proxy: this.proxy });

        // Navigate to Indeed
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Wait for job listings
        await randomDelay(2000, 4000);

        const jobs = await page.evaluate(() => {
          const results = [];

          // Indeed job cards selector (may change)
          const jobCards = document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultsList li, div[data-jk]');

          jobCards.forEach((card, index) => {
            if (index >= 25) return; // Limit to 25 jobs

            try {
              const titleEl = card.querySelector('.jobTitle, h2.jobTitle a, .jcs-JobTitle');
              const companyEl = card.querySelector('.companyName, [data-testid="company-name"]');
              const locationEl = card.querySelector('.companyLocation, [data-testid="text-location"]');
              const salaryEl = card.querySelector('.salary-snippet, .metadata.salary-snippet-container');
              const linkEl = card.querySelector('a[id^="job_"], a.jcs-JobTitle');
              const snippetEl = card.querySelector('.job-snippet, .jobCardShelfContainer');

              if (!titleEl || !companyEl) return;

              const title = titleEl.textContent.trim();
              const company = companyEl.textContent.trim();
              const location = locationEl ? locationEl.textContent.trim() : '';
              const salary = salaryEl ? salaryEl.textContent.trim() : null;
              const description = snippetEl ? snippetEl.textContent.trim() : '';
              const url = linkEl ? linkEl.href : '';

              // Extract job key from data attribute or URL
              const jobKey = card.getAttribute('data-jk') ||
                           (url.match(/jk=([a-zA-Z0-9]+)/) || [])[1];

              results.push({
                title,
                company,
                location,
                salary,
                description,
                url: url || `https://www.indeed.com/viewjob?jk=${jobKey}`,
                jobType: 'Full-time',
                postedDate: new Date().toISOString(),
                requirements: '',
                skills: [],
              });
            } catch (err) {
              console.error('Error parsing Indeed job card:', err.message);
            }
          });

          return results;
        });

        console.log(`[Puppeteer] Found ${jobs.length} Indeed jobs`);
        return jobs;

      } finally {
        await page.close();
      }
    }, 2, 2000);
  }

  /**
   * Fetch Naukri jobs using Puppeteer
   */
  async fetchNaukriJobs() {
    const searchKeywords = process.env.NAUKRI_SEARCH_KEYWORDS || 'software developer';
    const location = process.env.NAUKRI_LOCATION || 'India';

    const searchUrl = `https://www.naukri.com/${encodeURIComponent(searchKeywords)}-jobs-in-${encodeURIComponent(location)}?sort=date`;

    console.log(`[Puppeteer] Fetching jobs from Naukri: ${searchUrl}`);

    return await retryWithBackoff(async () => {
      await this.init();
      const page = await this.browser.newPage();

      try {
        await setupPuppeteerPage(page, { proxy: this.proxy });

        // Navigate to Naukri
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Wait for job listings
        await randomDelay(2000, 4000);

        const jobs = await page.evaluate(() => {
          const results = [];

          // Naukri job cards
          const jobCards = document.querySelectorAll('article.jobTuple, .cust-job-tuple, .srp-jobtuple-wrapper');

          jobCards.forEach((card, index) => {
            if (index >= 25) return; // Limit to 25 jobs

            try {
              const titleEl = card.querySelector('.title, .jobTuple-title a');
              const companyEl = card.querySelector('.companyInfo, .comp-name a');
              const locationEl = card.querySelector('.location, .loc-wrap .locWdth');
              const salaryEl = card.querySelector('.salary, .sal-wrap .salaryWdth');
              const expEl = card.querySelector('.experience, .exp-wrap .expWdth');
              const snippetEl = card.querySelector('.job-description, .job-desc');
              const linkEl = card.querySelector('a.title, .jobTuple-title a');
              const skillsEl = card.querySelectorAll('.tags, .tag-li');

              if (!titleEl || !companyEl) return;

              const title = titleEl.textContent.trim();
              const company = companyEl.textContent.trim();
              const location = locationEl ? locationEl.textContent.trim() : '';
              const salary = salaryEl ? salaryEl.textContent.trim() : null;
              const experience = expEl ? expEl.textContent.trim() : '';
              const description = snippetEl ? snippetEl.textContent.trim() : '';
              const url = linkEl ? linkEl.href : '';

              // Extract skills
              const skills = [];
              skillsEl.forEach(skillEl => {
                const skill = skillEl.textContent.trim();
                if (skill) skills.push(skill);
              });

              results.push({
                title,
                company,
                location,
                salary,
                description,
                url: url.startsWith('http') ? url : `https://www.naukri.com${url}`,
                jobType: 'Full-time',
                postedDate: new Date().toISOString(),
                requirements: experience,
                skills,
              });
            } catch (err) {
              console.error('Error parsing Naukri job card:', err.message);
            }
          });

          return results;
        });

        console.log(`[Puppeteer] Found ${jobs.length} Naukri jobs`);
        return jobs;

      } finally {
        await page.close();
      }
    }, 2, 2000);
  }

  /**
   * Fetch job details from a specific URL
   * Useful for getting full description
   */
  async fetchJobDetails(url) {
    await this.init();
    const page = await this.browser.newPage();

    try {
      await setupPuppeteerPage(page, { proxy: this.proxy });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await randomDelay(1000, 2000);

      const details = await page.evaluate(() => {
        // Generic selectors for job descriptions
        const descriptionEl = document.querySelector(
          '.description, .job-description, .jobDescriptionText, .show-more-less-html__markup, article'
        );

        return {
          description: descriptionEl ? descriptionEl.textContent.trim() : '',
        };
      });

      return details;

    } finally {
      await page.close();
    }
  }
}

module.exports = PuppeteerScraper;
