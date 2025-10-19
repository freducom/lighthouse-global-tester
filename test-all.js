const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

// All 50 websites split into batches
const allWebsites = [
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'chatgpt.com',
  'x.com', 'reddit.com', 'whatsapp.com', 'bing.com', 'wikipedia.org',
  'yahoo.co.jp', 'yahoo.com', 'tiktok.com', 'yandex.ru', 'amazon.com',
  'baidu.com', 'linkedin.com', 'temu.com', 'pornhub.com', 'naver.com',
  'netflix.com', 'live.com', 'pinterest.com', 'bilibili.com', 'twitch.tv',
  'microsoft.com', 'weather.com', 'vk.com', 'mail.ru', 'globo.com',
  'samsung.com', 'canva.com', 'duckduckgo.com', 'roblox.com', 'quora.com',
  'walmart.com', 'imdb.com', 'apple.com', 'paypal.com', 'aliexpress.com',
  'discord.com', 'github.com', 'spotify.com', 'zoom.us', 'adobe.com',
  'bbc.co.uk', 'etsy.com', 'shein.com', 'messenger.com', 'max.com'
];

async function testBatch(websites, batchNum, totalBatches) {
  const db = new Database();
  const runner = new LighthouseRunner();
  
  console.log(`\n🚀 Batch ${batchNum}/${totalBatches}: Testing ${websites.length} websites`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  const results = [];
  let successCount = 0;
  
  for (let i = 0; i < websites.length; i++) {
    const url = websites[i];
    console.log(`[${i + 1}/${websites.length}] Testing ${url}`);
    
    try {
      const scores = await runner.runAudit(url);
      await db.saveScore(url, scores);
      
      console.log(`✅ ${url}: P:${scores.performance}% A:${scores.accessibility}% BP:${scores.bestPractices}% SEO:${scores.seo}%`);
      
      results.push({ url, ...scores });
      successCount++;
    } catch (error) {
      console.log(`❌ ${url}: ${error.message}`);
    }
    
    // Short delay between tests
    if (i < websites.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log(`📊 Batch ${batchNum} completed! Success: ${successCount}/${websites.length}`);
  db.close();
  return results;
}

async function runAllTests() {
  const batchSize = 10;
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < allWebsites.length; i += batchSize) {
    batches.push(allWebsites.slice(i, i + batchSize));
  }
  
  console.log(`🎯 Testing ${allWebsites.length} websites in ${batches.length} batches of ${batchSize}`);
  
  let allResults = [];
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const results = await testBatch(batches[i], i + 1, batches.length);
    allResults = allResults.concat(results);
    
    // Longer break between batches
    if (i < batches.length - 1) {
      console.log(`⏳ Waiting 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Show final summary
  console.log(`\n🎉 All tests completed!`);
  console.log(`✅ Total successful: ${allResults.length}`);
  console.log(`❌ Total failed: ${allWebsites.length - allResults.length}`);
  
  // Show top performers
  const topPerformers = allResults
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 10);
  
  console.log(`\n🏆 Top 10 Performance Scores:`);
  console.table(topPerformers.map(site => ({
    Website: site.url,
    Performance: site.performance + '%',
    Accessibility: site.accessibility + '%',
    SEO: site.seo + '%'
  })));
  
  // Show final database query
  const db = new Database();
  const allScores = await db.getAllLatestScores();
  
  if (allScores.length > 0) {
    const avgPerformance = Math.round(allScores.reduce((sum, s) => sum + s.performance, 0) / allScores.length);
    const avgAccessibility = Math.round(allScores.reduce((sum, s) => sum + s.accessibility, 0) / allScores.length);
    const avgSeo = Math.round(allScores.reduce((sum, s) => sum + s.seo, 0) / allScores.length);
    
    console.log(`\n📊 Average Scores Across All Tested Sites:`);
    console.log(`Performance: ${avgPerformance}%`);
    console.log(`Accessibility: ${avgAccessibility}%`);
    console.log(`SEO: ${avgSeo}%`);
  }
  
  db.close();
}

runAllTests().catch(console.error);