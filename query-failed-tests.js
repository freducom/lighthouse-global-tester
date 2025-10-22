#!/usr/bin/env node

const Database = require('./database.js');

async function showFailedTestsReport() {
  const db = new Database();
  
  try {
    console.log('🔍 Lighthouse Failed Tests Report');
    console.log('==================================\n');
    
    // Get total count
    const totalCount = await db.getFailedTestsCount();
    console.log(`📊 Total Failed Tests: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('🎉 No failed tests recorded yet!');
      return;
    }
    
    // Get failed test statistics (grouped by domain)
    const stats = await db.getFailedTestsStats();
    console.log(`📈 Failed Test Statistics (${stats.length} unique domains):`);
    console.log('--------------------------------------------------------');
    
    stats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.url}`);
      console.log(`   Failures: ${stat.failure_count}`);
      console.log(`   First: ${stat.first_failure}`);
      console.log(`   Last: ${stat.last_failure}`);
      console.log('');
    });
    
    // Get recent failed tests
    console.log('\n🕒 Recent Failed Tests (Last 20):');
    console.log('----------------------------------');
    
    const recentFails = await db.getFailedTests(20);
    recentFails.forEach((test, index) => {
      console.log(`${index + 1}. ${test.url} - ${test.failure_timestamp}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  } finally {
    db.close();
  }
}

// Run the report if this script is called directly
if (require.main === module) {
  showFailedTestsReport();
}

module.exports = { showFailedTestsReport };