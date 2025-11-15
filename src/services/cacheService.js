const NodeCache = require('node-cache');

/**
 * Cache Service - In-memory caching for improved performance
 * Zero cost solution using node-cache
 */
class CacheService {
  constructor() {
    // Initialize cache with default TTL of 5 minutes
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // Better performance
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    this.stats.sets++;
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete key from cache
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  flush() {
    return this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Middleware function for Express routes
   */
  middleware(duration = 300) {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const key = `cache:${req.originalUrl}`;
      const cachedResponse = this.get(key);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json
      res.json = (body) => {
        // Cache successful responses
        if (res.statusCode === 200) {
          this.set(key, body, duration);
        }
        return originalJson(body);
      };

      next();
    };
  }
}

// Export singleton instance
module.exports = new CacheService();
