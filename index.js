const cron = require('node-cron');
const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

class LighthouseTester {
  constructor() {
    this.db = new Database();
    this.runner = new LighthouseRunner();
    
    // Major websites to test
    this.websites = [
      'google.com',
      'youtube.com', 
      'facebook.com',
      'instagram.com',
      'chatgpt.com',
      'x.com',
      'reddit.com',
      'whatsapp.com',
      'bing.com',
      'wikipedia.org',
      'yahoo.co.jp',
      'yahoo.com',
      'tiktok.com',
      'yandex.ru',
      'amazon.com',
      'baidu.com',
      'linkedin.com',
      'temu.com',
      'pornhub.com',
      'naver.com',
      'netflix.com',
      'live.com',
      'pinterest.com',
      'bilibili.com',
      'twitch.tv',
      'microsoft.com',
      'weather.com',
      'vk.com',
      'mail.ru',
      'globo.com',
      'samsung.com',
      'canva.com',
      'duckduckgo.com',
      'roblox.com',
      'quora.com',
      'walmart.com',
      'imdb.com',
      'apple.com',
      'paypal.com',
      'aliexpress.com',
      'discord.com',
      'github.com',
      'spotify.com',
      'zoom.us',
      'adobe.com',
      'bbc.co.uk',
      'etsy.com',
      'shein.com',
      'messenger.com',
      'max.com'
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

  async getHistoricalScores(url) {
    return await this.db.getScores(url);
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

  scheduleWeeklyTests() {
    // Run every Sunday at 9 AM
    cron.schedule('0 9 * * 0', async () => {
      console.log('\n⏰ Weekly scheduled test starting...');
      await this.testAllWebsites();
    });
    
    console.log('📅 Weekly Lighthouse tests scheduled for Sundays at 9 AM');
  }

  async runNow() {
    const results = await this.testAllWebsites();
    await this.showLatestScores();
    return results;
  }
}

// Main execution
async function main() {
  const tester = new LighthouseTester();
  
  // Check if running with --now flag
  if (process.argv.includes('--now')) {
    await tester.runNow();
    process.exit(0);
  } else {
    // Run tests immediately on start
    await tester.runNow();
    
    // Then schedule weekly tests
    tester.scheduleWeeklyTests();
    
    console.log('\n🔄 App is running. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      tester.db.close();
      process.exit(0);
    });
  }
}

main().catch(console.error);

module.exports = LighthouseTester;