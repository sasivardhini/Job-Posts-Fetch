#!/usr/bin/env node
/**
 * Standalone LinkedIn Job Scraper
 *
 * This is a simple script to test LinkedIn job scraping without running the full server.
 *
 * Usage:
 *   node linkedin-scraper-standalone.js
 *   node linkedin-scraper-standalone.js "software engineer" "San Francisco"
 */

require('dotenv').config();
const LinkedInScraper = require('./src/services/linkedinScraper');

async function main() {
  // Get search terms from command line args or use defaults
  const keywords = process.argv[2] || process.env.LINKEDIN_SEARCH_KEYWORDS || 'software developer';
  const location = process.argv[3] || process.env.LINKEDIN_LOCATION || 'United States';

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   LinkedIn Job Scraper - Standalone Mode        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`🔍 Searching for: "${keywords}"`);
  console.log(`📍 Location: "${location}"`);
  console.log('');

  const scraper = new LinkedInScraper();

  try {
    // Fetch jobs using all strategies
    const jobs = await scraper.fetchLinkedInJobs(keywords, location);

    // Display results
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║                   RESULTS                        ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    if (jobs.length === 0) {
      console.log('❌ No jobs found. Possible reasons:');
      console.log('   - Network restrictions in this environment');
      console.log('   - LinkedIn may be blocking requests');
      console.log('   - Try different search keywords');
      console.log('\n💡 TIP: Deploy to a production server for best results\n');
    } else {
      console.log(`✅ Found ${jobs.length} LinkedIn jobs!\n`);

      // Show first 5 jobs
      jobs.slice(0, 5).forEach((job, index) => {
        console.log(`${index + 1}. ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   URL: ${job.url}`);
        console.log('');
      });

      if (jobs.length > 5) {
        console.log(`   ... and ${jobs.length - 5} more jobs\n`);
      }

      // Save to JSON file
      const fs = require('fs');
      const filename = `linkedin-jobs-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(jobs, null, 2));
      console.log(`💾 Saved all ${jobs.length} jobs to: ${filename}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    // Cleanup
    await scraper.close();
    console.log('✓ Browser closed\n');
  }
}

// Run the scraper
main().catch(console.error);
