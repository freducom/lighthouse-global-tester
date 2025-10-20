const fs = require('fs');
const cron = require('node-cron');
const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

class GlobalLighthouseTester {
  constructor() {
    this.db = new Database();
    this.runner = new LighthouseRunner();
    
    // Load domains from JSON file
    this.loadDomains();
  }

  loadDomains() {
    try {
      const domainsData = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
      this.domainsByCountry = domainsData;
      
      // Flatten all domains with their countries
      this.allDomains = [];
      domainsData.forEach(countryData => {
        countryData.top_domains.forEach(domain => {
          this.allDomains.push({
            url: domain,
            country: countryData.country
          });
        });
      });
      
      console.log(`📍 Loaded ${this.allDomains.length} domains from ${domainsData.length} countries`);
    } catch (error) {
      console.error('Error loading domains.json:', error);
      process.exit(1);
    }
  }

  async testWebsite(domain, country) {
    try {
      console.log(`🔍 Testing ${domain} (${country})...`);
      const scores = await this.runner.runAudit(domain);
      
      // Check if the lighthouse runner returned error scores
      if (scores.error) {
        console.error(`❌ ${domain} failed with error: ${scores.errorMessage}`);
        // Don't save error results to database
        return {
          url: domain,
          country,
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0,
          pwa: 0,
          failed: true,
          errorMessage: scores.errorMessage
        };
      }
      
      // Save successful results to database
      await this.db.saveScore(domain, country, scores);
      
      console.log(`✅ ${domain}: P:${scores.performance}% A:${scores.accessibility}% BP:${scores.bestPractices}% SEO:${scores.seo}% PWA:${scores.pwa}%`);
      
      return { url: domain, country, ...scores };
    } catch (error) {
      console.error(`❌ Failed to test ${domain}: ${error.message}`);
      
      // Return a failed result object instead of null to continue processing
      return {
        url: domain,
        country,
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        pwa: 0,
        failed: true,
        errorMessage: error.message.substring(0, 100)
      };
    }
  }

  async testDailyBatch() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Load domains from JSON
    const domains = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
    
    // Get all domains
    const allDomains = [];
    for (const [country, domainList] of Object.entries(domains)) {
      for (const domain of domainList) {
        allDomains.push({ domain, country });
      }
    }
    
    // Sort domains alphabetically for consistent batching
    allDomains.sort((a, b) => a.domain.localeCompare(b.domain));
    
    // Calculate total domains and batch size
    const totalDomains = allDomains.length;
    const batchSize = Math.ceil(totalDomains / 7);
    
    // Calculate which domains to test today
    const startIndex = dayOfWeek * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalDomains);
    const todaysDomains = allDomains.slice(startIndex, endIndex);
    
    console.log(`\n📅 Today is ${today.toDateString()} (Day ${dayOfWeek})`);
    console.log(`📊 Testing batch ${dayOfWeek + 1}/7: ${todaysDomains.length} domains (${startIndex + 1}-${endIndex} of ${totalDomains})`);
    console.log(`🌍 Domains: ${todaysDomains.map(d => d.domain).join(', ')}\n`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const { domain, country } of todaysDomains) {
      const result = await this.testWebsite(domain, country);
      results.push(result);
      
      if (result.failed) {
        failureCount++;
      } else {
        successCount++;
      }
      
      // Add a small delay between tests to be nice to servers
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Batch Summary: ${successCount} successful, ${failureCount} failed tests`);
    if (failureCount > 0) {
      const failedDomains = results.filter(r => r.failed).map(r => r.url);
      console.log(`❌ Failed domains: ${failedDomains.join(', ')}`);
    }
    
    return results;
  }

  async testAllWebsites() {
    console.log(`\n🚀 Starting Global Lighthouse tests for ${this.allDomains.length} websites across ${this.domainsByCountry.length} countries...`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < this.allDomains.length; i++) {
      const { url, country } = this.allDomains[i];
      console.log(`\n[${i + 1}/${this.allDomains.length}] Testing ${url} (${country})`);
      
      const result = await this.testWebsite(url, country);
      results.push(result);
      
      if (result.failed) {
        failCount++;
      } else {
        successCount++;
      }
      
      // Wait 2 seconds between tests
      if (i < this.allDomains.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n📊 Global testing completed!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    if (failCount > 0) {
      const failedDomains = results.filter(r => r.failed).map(r => r.url);
      console.log(`❌ Failed domains: ${failedDomains.join(', ')}`);
    }
    console.log(`🕐 Finished at: ${new Date().toLocaleString()}`);
    
    return results;
  }

  async testCountry(countryName) {
    const countryData = this.domainsByCountry.find(c => c.country === countryName);
    if (!countryData) {
      console.log(`❌ Country "${countryName}" not found`);
      return [];
    }

    console.log(`\n🌍 Testing ${countryName} (${countryData.top_domains.length} domains)`);
    
    const results = [];
    for (let i = 0; i < countryData.top_domains.length; i++) {
      const domain = countryData.top_domains[i];
      console.log(`[${i + 1}/${countryData.top_domains.length}] Testing ${domain}`);
      
      const result = await this.testWebsite(domain, countryName);
      if (result) {
        results.push(result);
      }
      
      if (i < countryData.top_domains.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  async showResultsByCountry() {
    try {
      console.log('\n🌎 Lighthouse Scores by Country:\n');
      
      for (const countryData of this.domainsByCountry) {
        const scores = await this.db.getScoresByCountry(countryData.country);
        
        if (scores.length > 0) {
          console.log(`🏴 ${countryData.country}:`);
          console.table(scores.map(score => ({
            Domain: score.url,
            Performance: score.performance + '%',
            Accessibility: score.accessibility + '%',
            SEO: score.seo + '%'
          })));
          
          // Calculate country averages
          const avgPerf = Math.round(scores.reduce((sum, s) => sum + s.performance, 0) / scores.length);
          const avgAcc = Math.round(scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length);
          const avgSeo = Math.round(scores.reduce((sum, s) => sum + s.seo, 0) / scores.length);
          
          console.log(`Average - Performance: ${avgPerf}%, Accessibility: ${avgAcc}%, SEO: ${avgSeo}%\n`);
        }
      }
    } catch (error) {
      console.error('Error showing results by country:', error);
    }
  }

  async showGlobalSummary() {
    try {
      const allScores = await this.db.getAllLatestScores();
      
      if (allScores.length === 0) {
        console.log('No scores found. Run tests first.');
        return;
      }
      
      console.log(`\n📈 Global Summary (${allScores.length} websites tested):`);
      
      // Global averages
      const avgPerformance = Math.round(allScores.reduce((sum, s) => sum + s.performance, 0) / allScores.length);
      const avgAccessibility = Math.round(allScores.reduce((sum, s) => sum + s.accessibility, 0) / allScores.length);
      const avgBestPractices = Math.round(allScores.reduce((sum, s) => sum + s.best_practices, 0) / allScores.length);
      const avgSeo = Math.round(allScores.reduce((sum, s) => sum + s.seo, 0) / allScores.length);
      const avgPwa = Math.round(allScores.reduce((sum, s) => sum + s.pwa, 0) / allScores.length);
      
      console.log(`🌍 Global Averages:`);
      console.log(`Performance: ${avgPerformance}%`);
      console.log(`Accessibility: ${avgAccessibility}%`);
      console.log(`Best Practices: ${avgBestPractices}%`);
      console.log(`SEO: ${avgSeo}%`);
      console.log(`PWA: ${avgPwa}%`);
      
      // Top performers globally
      const topPerformers = allScores
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 5);
      
      console.log(`\n🏆 Top 5 Global Performers:`);
      console.table(topPerformers.map(score => ({
        Domain: score.url,
        Country: score.country,
        Performance: score.performance + '%',
        Accessibility: score.accessibility + '%',
        SEO: score.seo + '%'
      })));
      
    } catch (error) {
      console.error('Error showing global summary:', error);
    }
  }

  scheduleWeeklyTests() {
    // Run every Sunday at 9 AM
    cron.schedule('0 9 * * 0', async () => {
      console.log('\n⏰ Weekly scheduled test starting...');
      await this.testAllWebsites();
      await this.showResultsByCountry();
    });
    
    console.log('📅 Weekly global Lighthouse tests scheduled for Sundays at 9 AM');
  }

  getAvailableCountries() {
    return this.domainsByCountry.map(c => c.country);
  }

  async runNow() {
    const results = await this.testAllWebsites();
    await this.showResultsByCountry();
    await this.showGlobalSummary();
    return results;
  }
}

// Main execution
async function main() {
  const tester = new GlobalLighthouseTester();
  
  // Show available countries
  console.log('🌍 Available countries:', tester.getAvailableCountries().join(', '));
  console.log(`📊 Total domains: ${tester.allDomains.length} across ${tester.domainsByCountry.length} countries`);
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--now')) {
    await tester.runNow();
    process.exit(0);
  } else if (args.includes('--daily-batch')) {
    const dayIndex = args.indexOf('--daily-batch');
    const dayOfWeek = parseInt(args[dayIndex + 1]);
    
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      console.error('❌ Invalid day of week. Use 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)');
      process.exit(1);
    }
    
    await tester.testDailyBatch(dayOfWeek);
    await tester.showGlobalSummary();
    process.exit(0);
  } else if (args.includes('--country') && args[args.indexOf('--country') + 1]) {
    const country = args[args.indexOf('--country') + 1];
    await tester.testCountry(country);
    await tester.showResultsByCountry();
    process.exit(0);
  } else if (args.includes('--summary')) {
    await tester.showGlobalSummary();
    process.exit(0);
  } else {
    // Run tests immediately on start
    await tester.runNow();
    
    // Then schedule weekly tests
    tester.scheduleWeeklyTests();
    
    console.log('\n🔄 Global Lighthouse Tester is running. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      tester.db.close();
      process.exit(0);
    });
  }
}

main().catch(console.error);

module.exports = GlobalLighthouseTester;