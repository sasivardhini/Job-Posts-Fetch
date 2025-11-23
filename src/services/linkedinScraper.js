/**
 * Advanced LinkedIn Job Scraper - 2025 Edition
 *
 * Uses multiple strategies to scrape LinkedIn jobs reliably:
 * 1. Puppeteer-extra with stealth plugin (anti-detection)
 * 2. Google Jobs search (indexes LinkedIn jobs, bypasses AuthWall)
 * 3. Session cookie persistence (optional login support)
 *
 * Research sources:
 * - https://scrapfly.io/blog/posts/how-to-scrape-linkedin
 * - https://scrapingant.com/blog/avoid-detection-with-puppeteer-stealth
 * - https://scrapeops.io/puppeteer-web-scraping-playbook/nodejs-puppeteer-scrape-linkedin-jobs/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const {
  randomDelay,
  getNextUserAgent,
  getProxyFromEnv,
} = require('../utils/scraperUtils');

// Apply stealth plugin to evade detection
puppeteer.use(StealthPlugin());

class LinkedInScraper {
  constructor() {
    this.browser = null;
    this.cookiesPath = path.join(__dirname, '../../linkedin-cookies.json');
    this.proxy = getProxyFromEnv();
  }

  /**
   * Strategy 1: Google Jobs Search (RECOMMENDED - No LinkedIn blocking!)
   *
   * Google indexes LinkedIn jobs and displays them in Google Jobs search.
   * This bypasses LinkedIn's AuthWall completely.
   *
   * Example: google.com/search?q=software+developer+jobs+site:linkedin.com
   */
  async fetchViaGoogleJobs(keywords = 'software developer', location = 'United States') {
    console.log('[LinkedIn via Google Jobs] Fetching jobs without LinkedIn blocking...');

    try {
      await randomDelay(1000, 2000);

      const searchQuery = `${keywords} jobs ${location} site:linkedin.com/jobs`;
      const googleJobsUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&ibp=htl;jobs`;

      const response = await axios.get(googleJobsUrl, {
        headers: {
          'User-Agent': getNextUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      // Parse Google Jobs results
      // Google structures job listings in specific divs
      $('div[data-ved]').each((index, element) => {
        if (index >= 25) return false; // Limit to 25 jobs

        try {
          const $el = $(element);

          // Extract job title
          const titleEl = $el.find('h2, .BjJfJf, [role="heading"]').first();
          const title = titleEl.text().trim();

          // Extract company
          const companyEl = $el.find('.vNEEBe, .nJlQNd').first();
          const company = companyEl.text().trim();

          // Extract location
          const locationEl = $el.find('.Qk80Jf, .sMzDkb').first();
          const jobLocation = locationEl.text().trim();

          // Extract link
          const linkEl = $el.find('a[href*="linkedin.com"]').first();
          let jobUrl = linkEl.attr('href') || '';

          // Clean up Google redirect URL
          if (jobUrl.includes('google.com/url?q=')) {
            const urlMatch = jobUrl.match(/q=([^&]+)/);
            if (urlMatch) {
              jobUrl = decodeURIComponent(urlMatch[1]);
            }
          }

          // Extract description snippet
          const descEl = $el.find('.HBvzbc, .vdLnef').first();
          const description = descEl.text().trim();

          if (title && company && jobUrl.includes('linkedin.com')) {
            jobs.push({
              title,
              company,
              location: jobLocation || location,
              description: description || `${title} at ${company}`,
              url: jobUrl,
              salary: 'Not specified',
              jobType: 'Full-time',
              postedDate: new Date(),
              requirements: 'See LinkedIn posting for requirements',
              skills: [keywords],
              source: 'linkedin',
              status: 'active',
            });
          }
        } catch (err) {
          // Skip malformed entries
        }
      });

      console.log(`[LinkedIn via Google] Found ${jobs.length} jobs from Google Jobs search`);
      return jobs;

    } catch (error) {
      console.error('[LinkedIn via Google] Error:', error.message);
      return [];
    }
  }

  /**
   * Strategy 2: Direct LinkedIn Scraping with Stealth Puppeteer
   *
   * Uses puppeteer-extra-plugin-stealth to bypass LinkedIn's anti-bot detection.
   * Includes session cookie persistence for authenticated access.
   */
  async fetchViaStealthPuppeteer(keywords = 'software developer', location = 'United States') {
    console.log('[LinkedIn Stealth] Using advanced anti-detection techniques...');

    try {
      // Initialize browser with stealth
      await this.initBrowser();

      const page = await this.browser.newPage();

      // Set realistic viewport
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      // Load cookies if available (from previous login)
      await this.loadCookies(page);

      // Set extra headers to look more human
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      });

      // Build LinkedIn jobs search URL
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=r86400&sortBy=DD`;

      console.log(`[LinkedIn Stealth] Navigating to: ${searchUrl}`);

      // Navigate with random delay to appear human
      await randomDelay(2000, 4000);

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Random human-like delay
      await randomDelay(3000, 5000);

      // Scroll page to trigger lazy loading (human behavior)
      await this.humanScroll(page);

      // Save cookies for future use
      await this.saveCookies(page);

      // Extract jobs
      const jobs = await page.evaluate(() => {
        const results = [];

        // Multiple selectors as LinkedIn changes their DOM frequently
        const jobCards = document.querySelectorAll(
          'li.jobs-search-results__list-item, ' +
          '.job-search-card, ' +
          '.jobs-search__results-list > li, ' +
          '[data-job-id]'
        );

        jobCards.forEach((card, index) => {
          if (index >= 25) return; // Limit to 25 jobs

          try {
            // Title selectors
            const titleEl = card.querySelector(
              'h3.base-search-card__title, ' +
              '.job-search-card__title, ' +
              'h3, ' +
              'a.base-card__full-link'
            );
            const title = titleEl ? titleEl.textContent.trim() : '';

            // Company selectors
            const companyEl = card.querySelector(
              'h4.base-search-card__subtitle, ' +
              '.job-search-card__company-name, ' +
              'h4, ' +
              'a[data-tracking-control-name*="company"]'
            );
            const company = companyEl ? companyEl.textContent.trim() : '';

            // Location selectors
            const locationEl = card.querySelector(
              '.job-search-card__location, ' +
              '.base-search-card__metadata span, ' +
              '[class*="location"]'
            );
            const location = locationEl ? locationEl.textContent.trim() : 'Remote';

            // Link selectors
            const linkEl = card.querySelector(
              'a.base-card__full-link, ' +
              'a[href*="/jobs/view/"]'
            );
            let url = linkEl ? linkEl.href : '';

            // Posted date
            const timeEl = card.querySelector('time, .job-search-card__listdate');
            const postedDate = timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent) : null;

            // Job ID from data attribute or URL
            const jobId = card.getAttribute('data-job-id') ||
                         (url.match(/\/jobs\/view\/(\d+)/) || [])[1];

            if (!url && jobId) {
              url = `https://www.linkedin.com/jobs/view/${jobId}`;
            }

            // Description snippet
            const snippetEl = card.querySelector('.base-search-card__snippet, .job-search-card__snippet');
            const description = snippetEl ? snippetEl.textContent.trim() : '';

            if (title && company) {
              results.push({
                title,
                company,
                location,
                description: description || `${title} at ${company}. View full details on LinkedIn.`,
                url,
                postedDate,
                jobId,
              });
            }
          } catch (err) {
            console.error('Error parsing job card:', err.message);
          }
        });

        return results;
      });

      // Close page (keep browser alive for future requests)
      await page.close();

      // Format to standard job object
      const formattedJobs = jobs.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        url: job.url,
        salary: 'Not specified',
        jobType: 'Full-time',
        postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
        requirements: 'See LinkedIn posting for requirements',
        skills: [keywords],
        source: 'linkedin',
        status: 'active',
      }));

      console.log(`[LinkedIn Stealth] Found ${formattedJobs.length} jobs with stealth browser`);
      return formattedJobs;

    } catch (error) {
      console.error('[LinkedIn Stealth] Error:', error.message);

      // If we hit AuthWall, recommend using Google Jobs instead
      if (error.message.includes('authwall') || error.message.includes('login')) {
        console.log('[LinkedIn Stealth] Hit authentication wall. Use Google Jobs method instead.');
      }

      return [];
    }
  }

  /**
   * Strategy 3: Hybrid Approach (Best Results)
   *
   * Tries Google Jobs first (most reliable), falls back to stealth Puppeteer
   */
  async fetchLinkedInJobs(keywords = 'software developer', location = 'United States') {
    console.log('\n===========================================');
    console.log('LinkedIn Job Scraper - Multi-Strategy Mode');
    console.log('===========================================\n');

    const allJobs = [];
    const seenUrls = new Set();

    // Strategy 1: Google Jobs (RECOMMENDED)
    console.log('Strategy 1: Fetching via Google Jobs Search...');
    const googleJobs = await this.fetchViaGoogleJobs(keywords, location);

    googleJobs.forEach(job => {
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        allJobs.push(job);
      }
    });

    console.log(`✓ Got ${googleJobs.length} unique jobs from Google Jobs`);

    // Strategy 2: Stealth Puppeteer (if Google didn't get enough)
    if (allJobs.length < 10) {
      console.log('\nStrategy 2: Using Stealth Puppeteer for additional jobs...');
      const stealthJobs = await this.fetchViaStealthPuppeteer(keywords, location);

      stealthJobs.forEach(job => {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          allJobs.push(job);
        }
      });

      console.log(`✓ Got ${stealthJobs.length} additional jobs from stealth browser`);
    }

    console.log(`\n===========================================`);
    console.log(`TOTAL: ${allJobs.length} unique LinkedIn jobs`);
    console.log(`===========================================\n`);

    return allJobs;
  }

  /**
   * Initialize browser with stealth and anti-detection
   */
  async initBrowser() {
    if (!this.browser) {
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
          '--start-maximized',
        ],
        defaultViewport: null,
      };

      // Add proxy if configured
      if (this.proxy && this.proxy.host) {
        launchOptions.args.push(`--proxy-server=http://${this.proxy.host}:${this.proxy.port}`);
      }

      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  /**
   * Simulate human-like scrolling
   */
  async humanScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight / 2) { // Scroll halfway
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await randomDelay(1000, 2000);
  }

  /**
   * Load saved cookies (for authenticated access)
   */
  async loadCookies(page) {
    try {
      if (fs.existsSync(this.cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf8'));
        await page.setCookie(...cookies);
        console.log('[LinkedIn Stealth] Loaded session cookies');
      }
    } catch (error) {
      console.log('[LinkedIn Stealth] No saved cookies found');
    }
  }

  /**
   * Save cookies for future sessions
   */
  async saveCookies(page) {
    try {
      const cookies = await page.cookies();
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('[LinkedIn Stealth] Saved session cookies');
    } catch (error) {
      console.error('[LinkedIn Stealth] Error saving cookies:', error.message);
    }
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
}

module.exports = LinkedInScraper;
