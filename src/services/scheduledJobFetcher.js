const cron = require('node-cron');
const jobFetchService = require('./jobFetchService');

/**
 * Scheduled Job Fetcher - Automatically fetch jobs at regular intervals
 * Zero cost solution using node-cron
 */
class ScheduledJobFetcher {
  constructor() {
    this.tasks = [];
    this.isEnabled = process.env.AUTO_FETCH_ENABLED === 'true';
  }

  /**
   * Start scheduled job fetching
   * Default: Every hour
   */
  start() {
    if (!this.isEnabled) {
      console.log('Scheduled job fetching is disabled. Set AUTO_FETCH_ENABLED=true in .env to enable.');
      return;
    }

    // Fetch jobs every hour at minute 0
    const hourlyTask = cron.schedule('0 * * * *', async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled job fetch...`);
      try {
        const result = await jobFetchService.fetchAllJobs();
        console.log(`[${new Date().toISOString()}] Scheduled fetch completed: ${result.totalFetched} jobs fetched`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Scheduled fetch failed:`, error.message);
      }
    }, {
      scheduled: true,
      timezone: "America/New_York" // Change to your timezone
    });

    this.tasks.push({
      name: 'hourly-fetch',
      task: hourlyTask
    });

    console.log('Scheduled job fetching started (runs every hour)');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      console.log(`Stopped scheduled task: ${name}`);
    });
    this.tasks = [];
  }

  /**
   * Add custom scheduled task
   */
  addCustomTask(name, cronExpression, callback) {
    const task = cron.schedule(cronExpression, callback, {
      scheduled: true
    });

    this.tasks.push({ name, task });
    console.log(`Custom scheduled task added: ${name} (${cronExpression})`);
  }

  /**
   * Get status of all tasks
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      activeTasks: this.tasks.length,
      tasks: this.tasks.map(({ name, task }) => ({
        name,
        running: task.getStatus() === 'scheduled'
      }))
    };
  }
}

// Export singleton instance
module.exports = new ScheduledJobFetcher();
