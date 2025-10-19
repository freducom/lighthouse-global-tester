const Database = require('./database');
const LighthouseRunner = require('./lighthouse-runner');

// Test 10 major sites at a time
const websites = [
  'google.com',
  'youtube.com', 
  'facebook.com',
  'instagram.com',
  'x.com',
  'reddit.com',
  'wikipedia.org',
  'amazon.com',
  'linkedin.com',
  'github.com'
];

async function runTests() {
  const db = new Database();
  const runner = new LighthouseRunner();
  
  console.log(`🚀 Testing ${websites.length} major websites...`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  const results = [];
  let successCount = 0;
  
  for (let i = 0; i < websites.length; i++) {
    const url = websites[i];
    console.log(`\n[${i + 1}/${websites.length}] Testing ${url}`);
    
    try {
      const scores = await runner.runAudit(url);
      await db.saveScore(url, scores);
      
      console.log(`✅ ${url}: P:${scores.performance}% A:${scores.accessibility}% BP:${scores.bestPractices}% SEO:${scores.seo}% PWA:${scores.pwa}%`);
      
      results.push({ url, ...scores });
      successCount++;
    } catch (error) {
      console.log(`❌ ${url}: ${error.message}`);
    }
    
    // Short delay between tests
    if (i < websites.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n📊 Completed! Success: ${successCount}/${websites.length}`);
  
  // Show results
  const allScores = await db.getAllLatestScores();
  console.log('\n📈 Latest Results:');
  console.table(allScores.slice(-10).map(score => ({
    Website: score.url,
    Performance: score.performance + '%',
    Accessibility: score.accessibility + '%',
    SEO: score.seo + '%'
  })));
  
  db.close();
}

runTests().catch(console.error);