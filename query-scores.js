const Database = require('./database');

async function queryScores() {
  const db = new Database();
  
  try {
    console.log('📊 Latest Lighthouse Scores for All Websites:\n');
    
    const scores = await db.getAllLatestScores();
    
    if (scores.length === 0) {
      console.log('No scores found. Run the tests first with: npm start');
      return;
    }
    
    // Display as a formatted table
    console.table(scores.map(score => ({
      'Website': score.url,
      'Country': score.country || 'N/A',
      'Performance': score.performance + '%',
      'Accessibility': score.accessibility + '%', 
      'Best Practices': score.best_practices + '%',
      'SEO': score.seo + '%',
      'PWA': score.pwa + '%',
      'Test Date': new Date(score.test_date).toLocaleString()
    })));
    
    // Calculate averages
    const avgPerformance = Math.round(scores.reduce((sum, s) => sum + s.performance, 0) / scores.length);
    const avgAccessibility = Math.round(scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length);
    const avgBestPractices = Math.round(scores.reduce((sum, s) => sum + s.best_practices, 0) / scores.length);
    const avgSeo = Math.round(scores.reduce((sum, s) => sum + s.seo, 0) / scores.length);
    const avgPwa = Math.round(scores.reduce((sum, s) => sum + s.pwa, 0) / scores.length);
    
    console.log('\n📈 Average Scores Across All Sites:');
    console.log(`Performance: ${avgPerformance}%`);
    console.log(`Accessibility: ${avgAccessibility}%`);
    console.log(`Best Practices: ${avgBestPractices}%`);
    console.log(`SEO: ${avgSeo}%`);
    console.log(`PWA: ${avgPwa}%`);
    
  } catch (error) {
    console.error('Error querying scores:', error);
  } finally {
    db.close();
  }
}

queryScores();