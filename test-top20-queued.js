const fs = require('fs');
const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

class QueuedSitesTester {
  constructor() {
    this.db = new Database();
    this.runner = new LighthouseRunner();
  }

  async getQueuedSites() {
    console.log('📋 Getting queued sites from domains.json...');
    
    // Load domains from domains.json
    let allDomains = [];
    try {
      const domainsData = JSON.parse(fs.readFileSync('domains.json', 'utf8'));
      domainsData.forEach(countryData => {
        countryData.top_domains.forEach(domain => {
          allDomains.push({
            domain: domain.domain,
            country: countryData.country,
            industry: domain.industry
          });
        });
      });
    } catch (error) {
      console.error('Error reading domains.json:', error);
      return [];
    }

    // Get all domains that have scores in the database
    const domainsWithScores = await new Promise((resolve, reject) => {
      this.db.db.all(
        'SELECT DISTINCT url FROM lighthouse_scores',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.url));
        }
      );
    });

    // Find domains that are in domains.json but not in the database (queued sites)
    const queuedSites = allDomains.filter(site => 
      !domainsWithScores.includes(site.domain)
    );

    console.log(`Found ${queuedSites.length} queued sites`);
    console.log(`Already tested: ${domainsWithScores.length} sites`);
    
    return queuedSites;
  }

  async testWebsite(siteInfo) {
    const url = siteInfo.domain;
    try {
      console.log(`\n🔍 Testing ${url} (${siteInfo.country} - ${siteInfo.industry})...`);
      const scores = await this.runner.runAudit(url);
      await this.db.saveScore(url, scores);
      
      console.log(`✅ ${url} completed!`);
      console.log(`   Performance: ${scores.performance}%`);
      console.log(`   Accessibility: ${scores.accessibility}%`);
      console.log(`   Best Practices: ${scores.bestPractices}%`);
      console.log(`   SEO: ${scores.seo}%`);
      console.log(`   PWA: ${scores.pwa}%`);
      
      return { ...scores, url, country: siteInfo.country, industry: siteInfo.industry };
    } catch (error) {
      console.error(`❌ Failed to test ${url}:`, error.message);
      return null;
    }
  }

  async testTop20Queued() {
    console.log('\n🚀 Testing top 20 queued sites from domains.json...');
    console.log(`Started at: ${new Date().toLocaleString()}`);
    
    const queuedSites = await this.getQueuedSites();
    
    if (queuedSites.length === 0) {
      console.log('🎉 No queued sites found! All domains have been tested.');
      return [];
    }
    
    // Take the first 20 queued sites (they're in order from domains.json)
    const sitesToTest = queuedSites.slice(0, 20);
    
    console.log(`\n🎯 Testing ${sitesToTest.length} sites:`);
    sitesToTest.forEach((site, i) => {
      console.log(`${i + 1}. ${site.domain} (${site.country} - ${site.industry})`);
    });
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < sitesToTest.length; i++) {
      const site = sitesToTest[i];
      console.log(`\n[${i + 1}/${sitesToTest.length}] Testing ${site.domain}`);
      
      const result = await this.testWebsite(site);
      if (result) {
        results.push(result);
        successCount++;
      } else {
        failCount++;
      }
      
      // Wait 3 seconds between tests to avoid rate limiting
      if (i < sitesToTest.length - 1) {
        console.log('⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`\n📊 Testing completed!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`🕐 Finished at: ${new Date().toLocaleString()}`);
    
    // Show results summary
    if (results.length > 0) {
      console.log(`\n🏆 Test Results Summary:`);
      console.table(results.map(result => ({
        Website: result.url,
        Country: result.country,
        Industry: result.industry,
        Performance: result.performance + '%',
        Accessibility: result.accessibility + '%',
        'Best Practices': result.bestPractices + '%',
        SEO: result.seo + '%',
        PWA: result.pwa + '%'
      })));
      
      // Show top performers from this batch
      const topPerformers = results
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 5);
      
      console.log(`\n🥇 Top 5 Performance Scores from this batch:`);
      console.table(topPerformers.map(site => ({
        Website: site.url,
        Performance: site.performance + '%',
        Country: site.country,
        Industry: site.industry
      })));
    }
    
    return results;
  }

  async run() {
    try {
      const results = await this.testTop20Queued();
      return results;
    } finally {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  console.log('🔬 Testing top 20 queued sites from domains.json...');
  const tester = new QueuedSitesTester();
  await tester.run();
  process.exit(0);
}

main().catch(console.error);