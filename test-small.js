const cron = require('node-cron');
const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

class LighthouseTester {
  constructor() {
    this.db = new Database();
    this.runner = new LighthouseRunner();
    
    // Test with just a few sites first
    this.websites = [
      'google.com',
      'youtube.com', 
      'github.com',
      'wikipedia.org',
      'microsoft.com'
    ];
  }

  async testWebsite(url) {
    try {
      console.log(`\n🔍 Testing ${url}...`);
      const scores = await this.runner.runAudit(url);
      await this.db.saveScore(url, scores);
      
      console.log(`✅ ${url} completed!`);
      console.log(`   Performance: ${scores.performance}%`);
      console.log(`   Accessibility: ${scores.accessibility}%`);
      console.log(`   Best Practices: ${scores.bestPractices}%`);
      console.log(`   SEO: ${scores.seo}%`);
      console.log(`   PWA: ${scores.pwa}%`);
      
      return scores;
    } catch (error) {
      console.error(`❌ Failed to test ${url}:`, error.message);
      return null;
    }
  }

  async testAllWebsites() {
    console.log(`\n🚀 Starting Lighthouse tests for ${this.websites.length} websites...`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < this.websites.length; i++) {
      const url = this.websites[i];
      console.log(`\n[${i + 1}/${this.websites.length}] Testing ${url}`);
      
      const result = await this.testWebsite(url);
      if (result) {
        results.push({ url, ...result });
        successCount++;
      } else {
        failCount++;
      }
      
      // Wait 3 seconds between tests to avoid rate limiting
      if (i < this.websites.length - 1) {
        console.log('⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`\n📊 Testing completed!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`🕐 Finished at: ${new Date().toLocaleString()}`);
    
    return results;
  }

  async showLatestScores() {
    try {
      const scores = await this.db.getAllLatestScores();
      console.log('\n📈 Latest Lighthouse Scores:');
      console.table(scores.map(score => ({
        URL: score.url,
        Performance: score.performance + '%',
        Accessibility: score.accessibility + '%',
        'Best Practices': score.best_practices + '%',
        SEO: score.seo + '%',
        PWA: score.pwa + '%',
        'Test Date': new Date(score.test_date).toLocaleDateString()
      })));
    } catch (error) {
      console.error('Error fetching latest scores:', error);
    }
  }

  async runNow() {
    const results = await this.testAllWebsites();
    await this.showLatestScores();
    return results;
  }
}

// Main execution
async function main() {
  console.log('🔬 Running test with 5 websites...');
  const tester = new LighthouseTester();
  await tester.runNow();
  process.exit(0);
}

main().catch(console.error);