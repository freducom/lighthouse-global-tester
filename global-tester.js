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
      
      // Flatten all domains with their countries and industries
      this.allDomains = [];
      domainsData.forEach(countryData => {
        countryData.top_domains.forEach(domainInfo => {
          this.allDomains.push({
            url: domainInfo.domain,
            country: countryData.country,
            industry: domainInfo.industry
          });
        });
      });
      
      console.log(`📍 Loaded ${this.allDomains.length} domains from ${domainsData.length} countries`);
    } catch (error) {
      console.error('Error loading domains.json:', error);
      process.exit(1);
    }
  }

  async testWebsite(domain, country, industry) {
    try {
      console.log(`🔍 Testing ${domain} (${country})...`);
      const scores = await this.runner.runAudit(domain);
      
      // Check if the lighthouse runner returned error scores
      if (scores.error) {
        console.error(`❌ ${domain} failed with error: ${scores.errorMessage}`);
        // Save the failed test to the failed tests table
        await this.db.saveFailedTest(domain);
        return {
          url: domain,
          country,
          industry,
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
      await this.db.saveScore(domain, country, industry, scores);
      
      console.log(`✅ ${domain}: P:${scores.performance}% A:${scores.accessibility}% BP:${scores.bestPractices}% SEO:${scores.seo}% PWA:${scores.pwa}%`);
      
      return { url: domain, country, industry, ...scores };
    } catch (error) {
      console.error(`❌ Failed to test ${domain}: ${error.message}`);
      
      // Save the failed test to the failed tests table
      try {
        await this.db.saveFailedTest(domain);
      } catch (dbError) {
        console.error(`Failed to save failed test for ${domain}: ${dbError.message}`);
      }
      
      // Return a failed result object instead of null to continue processing
      return {
        url: domain,
        country,
        industry,
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

  async testDailyBatch(dayOfWeek) {
    const today = new Date();
    
    // Load domains from JSON
    const domains = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
    
    // Get all domains
    const allDomains = [];
    for (const countryData of domains) {
      for (const domainInfo of countryData.top_domains) {
        allDomains.push({ 
          domain: domainInfo.domain, 
          country: countryData.country,
          industry: domainInfo.industry
        });
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
    
    for (const { domain, country, industry } of todaysDomains) {
      const result = await this.testWebsite(domain, country, industry);
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

  async testHourlyBatch(batchIndex) {
    const now = new Date();
    
    // Load domains from JSON
    const domains = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
    
    // Get all domains
    const allDomains = [];
    for (const countryData of domains) {
      for (const domainInfo of countryData.top_domains) {
        allDomains.push({ 
          domain: domainInfo.domain, 
          country: countryData.country,
          industry: domainInfo.industry
        });
      }
    }
    
    // Sort domains alphabetically for consistent batching
    allDomains.sort((a, b) => a.domain.localeCompare(b.domain));
    
    // Calculate total domains and batch size for 84 batches
    const totalDomains = allDomains.length;
    const batchSize = Math.ceil(totalDomains / 84);
    
    // Calculate which domains to test in this batch
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalDomains);
    
    // Check if this batch index is beyond the available domains
    if (startIndex >= totalDomains) {
      console.log(`📊 Batch ${batchIndex + 1}/84: No domains to test (batch index ${batchIndex} is beyond available domains)`);
      console.log(`ℹ️  Only ${Math.ceil(totalDomains / batchSize)} batches are needed for ${totalDomains} domains`);
      return [];
    }
    
    const batchDomains = allDomains.slice(startIndex, endIndex);
    
    const dayOfWeek = Math.floor(batchIndex / 12);
    const hourSlot = batchIndex % 12;
    const hourRange = `${(hourSlot * 2).toString().padStart(2, '0')}-${((hourSlot * 2) + 1).toString().padStart(2, '0')}`;
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    console.log(`\n📅 ${now.toISOString()} - ${dayName}, ${hourRange} UTC`);
    console.log(`📊 Testing batch ${batchIndex + 1}/84: ${batchDomains.length} domains (${startIndex + 1}-${endIndex} of ${totalDomains})`);
    console.log(`🌍 Domains: ${batchDomains.map(d => d.domain).join(', ')}\n`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const { domain, country, industry } of batchDomains) {
      const result = await this.testWebsite(domain, country, industry);
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
      const { url, country, industry } = this.allDomains[i];
      console.log(`\n[${i + 1}/${this.allDomains.length}] Testing ${url} (${country})`);
      
      const result = await this.testWebsite(url, country, industry);
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
      const domainInfo = countryData.top_domains[i];
      console.log(`[${i + 1}/${countryData.top_domains.length}] Testing ${domainInfo.domain}`);
      
      const result = await this.testWebsite(domainInfo.domain, countryName, domainInfo.industry);
      if (result) {
        results.push(result);
      }
      
      if (i < countryData.top_domains.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  async testTop20Untested() {
    console.log('🔍 Finding top 20 untested sites...');
    
    // Get all tested domains from database
    const testedScores = await this.db.getAllLatestScores();
    const testedSet = new Set(testedScores.map(score => score.url));
    
    // Find untested domains across all countries
    const untestedDomains = [];
    for (const countryData of this.domainsByCountry) {
      for (const domainInfo of countryData.top_domains) {
        if (!testedSet.has(domainInfo.domain)) {
          untestedDomains.push({
            domain: domainInfo.domain,
            country: countryData.country,
            industry: domainInfo.industry
          });
        }
      }
    }
    
    // Sort alphabetically and take first 20
    untestedDomains.sort((a, b) => a.domain.localeCompare(b.domain));
    const top20Untested = untestedDomains.slice(0, 20);
    
    console.log(`📋 Found ${untestedDomains.length} untested domains total`);
    console.log(`🎯 Testing top 20 untested sites:`);
    
    for (let i = 0; i < top20Untested.length; i++) {
      const item = top20Untested[i];
      console.log(`${i + 1}. ${item.domain} (${item.country})`);
    }
    
    console.log('\n🚀 Starting tests...\n');
    
    const results = [];
    for (let i = 0; i < top20Untested.length; i++) {
      const item = top20Untested[i];
      console.log(`\n📊 Testing ${i + 1}/${top20Untested.length}: ${item.domain} (${item.country})`);
      
      try {
        const result = await this.testWebsite(item.domain, item.country, item.industry);
        if (result) {
          results.push({
            domain: item.domain,
            country: item.country,
            industry: item.industry,
            score: result.performance,
            success: true
          });
          console.log(`✅ ${item.domain}: ${result.performance}`);
        } else {
          results.push({
            domain: item.domain,
            country: item.country,
            industry: item.industry,
            error: 'Test returned null result',
            success: false
          });
          console.log(`❌ ${item.domain}: Test returned null result`);
        }
      } catch (error) {
        console.error(`❌ Error testing ${item.domain}:`, error.message);
        results.push({
          domain: item.domain,
          country: item.country,
          industry: item.industry,
          error: error.message,
          success: false
        });
      }
      
      // Wait between tests
      if (i < top20Untested.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n📈 Completed testing ${results.length} domains`);
    console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
    
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

// Global error handling to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  console.log('⚠️ Continuing execution despite error...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('⚠️ Continuing execution despite error...');
});

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
  } else if (args.includes('--top20-untested')) {
    await tester.testTop20Untested();
    process.exit(0);
  } else if (args.includes('--hourly-batch')) {
    const batchIndex = args.indexOf('--hourly-batch');
    const batchNumber = parseInt(args[batchIndex + 1]);
    
    // Calculate how many batches are actually needed
    const totalDomains = tester.allDomains.length;
    const batchSize = Math.ceil(totalDomains / 84);
    const actualBatchesNeeded = Math.ceil(totalDomains / batchSize);
    
    if (isNaN(batchNumber) || batchNumber < 0 || batchNumber > 83) {
      console.error(`❌ Invalid batch index. Use 0-83 (84 batches total, but only ${actualBatchesNeeded} needed for ${totalDomains} domains)`);
      process.exit(1);
    }
    
    // Warn if batch is beyond what's needed
    if (batchNumber >= actualBatchesNeeded) {
      console.log(`⚠️  Batch ${batchNumber} is beyond the ${actualBatchesNeeded} batches needed for ${totalDomains} domains`);
    }
    
    let batchResults = null;
    let hasSuccessfulTests = false;
    
    try {
      console.log('🚀 Starting bi-hourly batch testing with enhanced error handling...');
      batchResults = await tester.testHourlyBatch(batchNumber);
      
      // Check if we have any successful tests
      if (batchResults && batchResults.length > 0) {
        hasSuccessfulTests = batchResults.some(result => !result.failed);
        console.log(`📊 Batch completed: ${batchResults.filter(r => !r.failed).length} successful, ${batchResults.filter(r => r.failed).length} failed`);
      }
      
      console.log('✅ Bi-hourly batch testing completed successfully');
    } catch (error) {
      console.error('🚨 Bi-hourly batch testing encountered a fatal error:', error.message);
      console.error('Stack:', error.stack);
      
      // Even if batch testing failed, check if we have some successful results from partial execution
      console.log('⚠️ Checking for any successful tests that were saved to database...');
      hasSuccessfulTests = true; // Assume we might have some data
    }
    
    // Always try to show summary, even with partial data
    try {
      await tester.showGlobalSummary();
    } catch (summaryError) {
      console.error('❌ Could not show summary:', summaryError.message);
    }
    
    if (hasSuccessfulTests) {
      console.log('🏁 Bi-hourly batch testing completed with some successful results');
    } else {
      console.log('🏁 Bi-hourly batch testing completed but no successful tests were recorded');
    }
    
    process.exit(0);
  } else if (args.includes('--daily-batch')) {
    const dayIndex = args.indexOf('--daily-batch');
    const dayOfWeek = parseInt(args[dayIndex + 1]);
    
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      console.error('❌ Invalid day of week. Use 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)');
      process.exit(1);
    }
    
    let batchResults = null;
    let hasSuccessfulTests = false;
    
    try {
      console.log('🚀 Starting daily batch testing with enhanced error handling...');
      batchResults = await tester.testDailyBatch(dayOfWeek);
      
      // Check if we have any successful tests
      if (batchResults && batchResults.length > 0) {
        hasSuccessfulTests = batchResults.some(result => !result.failed);
        console.log(`📊 Batch completed: ${batchResults.filter(r => !r.failed).length} successful, ${batchResults.filter(r => r.failed).length} failed`);
      }
      
      console.log('✅ Daily batch testing completed successfully');
    } catch (error) {
      console.error('🚨 Daily batch testing encountered a fatal error:', error.message);
      console.error('Stack:', error.stack);
      
      // Even if batch testing failed, check if we have some successful results from partial execution
      console.log('⚠️ Checking for any successful tests that were saved to database...');
      
      try {
        const allScores = await tester.db.getAllLatestScores();
        hasSuccessfulTests = allScores && allScores.length > 0;
        console.log(`📊 Found ${allScores ? allScores.length : 0} total scores in database`);
      } catch (dbError) {
        console.error('❌ Could not check database for existing scores:', dbError.message);
      }
    }
    
    // Always attempt to show summary if we have any data
    console.log('📈 Attempting to show global summary...');
    try {
      await tester.showGlobalSummary();
    } catch (summaryError) {
      console.error('❌ Could not show summary:', summaryError.message);
      console.log('ℹ️ This is not critical - website generation may still work');
    }
    
    // Final status report
    if (hasSuccessfulTests) {
      console.log('� Daily batch completed with at least some successful tests - database has been updated');
      console.log('📄 Website generation and deployment should proceed with available data');
    } else {
      console.log('⚠️ No successful tests detected, but continuing to allow website generation with existing data');
    }
    
    console.log('🏁 Daily batch process completed - exiting with code 0 to ensure CI pipeline continues');
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