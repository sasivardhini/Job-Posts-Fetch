/**
 * Scraper Utilities - Production-ready web scraping helpers
 * Includes user agent rotation, delays, and proxy support
 */

// Pool of realistic user agents for rotation
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',

  // Firefox on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',

  // Safari on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',

  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

  // Chrome on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Counter for round-robin user agent selection
let userAgentIndex = 0;

/**
 * Get a random user agent from the pool
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get next user agent in round-robin fashion
 */
function getNextUserAgent() {
  const userAgent = USER_AGENTS[userAgentIndex];
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return userAgent;
}

/**
 * Add random delay between requests to avoid rate limiting
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 */
async function randomDelay(minMs = 1000, maxMs = 3000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Add fixed delay
 * @param {number} ms - Delay in milliseconds
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get axios config with rotating user agent and optional proxy
 * @param {Object} options - Configuration options
 * @param {string} options.referer - Referer URL
 * @param {number} options.timeout - Request timeout
 * @param {Object} options.proxy - Proxy configuration {host, port, auth: {username, password}}
 */
function getAxiosConfig(options = {}) {
  const config = {
    headers: {
      'User-Agent': getNextUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    },
    timeout: options.timeout || 15000,
    maxRedirects: 5,
    validateStatus: (status) => status < 500,
  };

  // Add referer if provided
  if (options.referer) {
    config.headers['Referer'] = options.referer;
  }

  // Add proxy if provided
  if (options.proxy) {
    config.proxy = options.proxy;
  }

  return config;
}

/**
 * Get Puppeteer launch options with anti-detection measures
 * @param {Object} options - Configuration options
 * @param {Object} options.proxy - Proxy configuration {server, username, password}
 */
function getPuppeteerConfig(options = {}) {
  const config = {
    headless: 'new', // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  };

  // Add proxy if provided
  if (options.proxy && options.proxy.server) {
    config.args.push(`--proxy-server=${options.proxy.server}`);
  }

  return config;
}

/**
 * Setup page with anti-detection measures
 * @param {Object} page - Puppeteer page object
 * @param {Object} options - Configuration options
 */
async function setupPuppeteerPage(page, options = {}) {
  // Set user agent
  await page.setUserAgent(getNextUserAgent());

  // Authenticate proxy if credentials provided
  if (options.proxy && options.proxy.username && options.proxy.password) {
    await page.authenticate({
      username: options.proxy.username,
      password: options.proxy.password,
    });
  }

  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
  });

  // Inject anti-detection scripts
  await page.evaluateOnNewDocument(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Override Chrome detection
    window.chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // Override plugins to make it look real
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });

  return page;
}

/**
 * Extract proxy configuration from environment variables
 * Format: PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD
 */
function getProxyFromEnv() {
  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT;

  if (!host || !port) {
    return null;
  }

  const proxy = {
    host,
    port: parseInt(port),
  };

  // Add authentication if provided
  if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
    proxy.auth = {
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    };
  }

  return proxy;
}

/**
 * Get Puppeteer proxy configuration from environment
 */
function getPuppeteerProxyFromEnv() {
  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT;

  if (!host || !port) {
    return null;
  }

  const proxy = {
    server: `${host}:${port}`,
  };

  // Add authentication if provided
  if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
    proxy.username = process.env.PROXY_USERNAME;
    proxy.password = process.env.PROXY_PASSWORD;
  }

  return proxy;
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
}

module.exports = {
  getRandomUserAgent,
  getNextUserAgent,
  randomDelay,
  delay,
  getAxiosConfig,
  getPuppeteerConfig,
  setupPuppeteerPage,
  getProxyFromEnv,
  getPuppeteerProxyFromEnv,
  retryWithBackoff,
  USER_AGENTS,
};
