#!/usr/bin/env node

const Database = require('./database.js');
const LighthouseRunner = require('./lighthouse-runner.js');

class ManualTester {
  constructor() {
    this.db = new Database();
    this.runner = new LighthouseRunner();
  }

  async testUntestedDomains(count = 10) {
    try {
      console.log('🎯 Manual Testing - Untested Domains Only');
      console.log('==========================================\n');

      console.log('📊 Finding never-tested domains...');
      const categorizedDomains = await this.db.getDomainsByCategory();
      
      const neverTested = categorizedDomains.never_tested;
      console.log(`🆕 Found ${neverTested.length} never-tested domains`);

      if (neverTested.length === 0) {
        console.log('🎉 Amazing! All domains have been tested at least once.');
        return [];
      }

      // Select domains to test
      const domainsToTest = neverTested.slice(0, count);
      console.log(`🎯 Selected ${domainsToTest.length} domains for testing\n`);

      // Show selected domains
      console.log('📋 Domains to be tested:');
      console.log('------------------------');
      domainsToTest.forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain} (${domain.country} - ${domain.industry})`);
      });

      console.log('\n🧪 Starting lighthouse tests...');
      console.log('================================\n');

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < domainsToTest.length; i++) {
        const domain = domainsToTest[i];
        const progress = `[${i + 1}/${domainsToTest.length}]`;
        
        console.log(`${progress} 🔍 Testing ${domain.domain}...`);
        
        try {
          console.log(`   🔍 Running lighthouse test...`);
          const scores = await this.runner.runAudit(domain.domain);
          
          // Check if the lighthouse runner returned error scores
          if (scores.error) {
            failureCount++;
            console.log(`   ❌ Failed: ${scores.errorMessage}`);
            await this.db.saveFailedTest(domain.domain);
            
            results.push({
              url: domain.domain,
              country: domain.country,
              industry: domain.industry,
              performance: 0,
              accessibility: 0,
              best_practices: 0,
              seo: 0,
              pwa: 0,
              failed: true,
              errorMessage: scores.errorMessage
            });
          } else if (scores.performance === 0 && scores.accessibility === 0 && scores.bestPractices === 0 && scores.seo === 0 && scores.pwa === 0) {
            // All scores are zero - this is a failed test
            failureCount++;
            console.log(`   ❌ Failed: All scores returned zero`);
            await this.db.saveFailedTest(domain.domain);
            
            results.push({
              url: domain.domain,
              country: domain.country,
              industry: domain.industry,
              performance: 0,
              accessibility: 0,
              best_practices: 0,
              seo: 0,
              pwa: 0,
              failed: true,
              errorMessage: 'All lighthouse scores returned zero'
            });
          } else {
            // Save successful results to database
            await this.db.saveScore(domain.domain, domain.country, domain.industry, scores);
            successCount++;
            console.log(`   ✅ Success: P:${scores.performance}% A:${scores.accessibility}% SEO:${scores.seo}% BP:${scores.bestPractices}% PWA:${scores.pwa}%`);
            
            results.push({
              url: domain.domain,
              country: domain.country,
              industry: domain.industry,
              ...scores
            });
          }
          
          // Small delay to prevent overwhelming the system
          if (i < domainsToTest.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          failureCount++;
          console.log(`   ❌ Error: ${error.message}`);
          
          // Save the failed test to the failed tests table
          try {
            await this.db.saveFailedTest(domain.domain);
          } catch (dbError) {
            console.error(`   Failed to save failed test: ${dbError.message}`);
          }
          
          results.push({
            url: domain.domain,
            country: domain.country,
            industry: domain.industry,
            performance: 0,
            accessibility: 0,
            best_practices: 0,
            seo: 0,
            pwa: 0,
            failed: true,
            errorMessage: error.message.substring(0, 100)
          });
        }
      }

      // Summary
      console.log('\n📊 Manual Testing Complete!');
      console.log('============================');
      console.log(`✅ Successful tests: ${successCount}`);
      console.log(`❌ Failed tests: ${failureCount}`);
      console.log(`🎯 Total tests: ${results.length}`);
      console.log(`📈 Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

      // Show remaining untested domains
      const remaining = neverTested.length - domainsToTest.length;
      if (remaining > 0) {
        console.log(`\n🔄 Remaining untested domains: ${remaining}`);
        console.log('   Run this command again to test more!');
      } else {
        console.log('\n🎉 All domains have now been tested at least once!');
      }

      return results;

    } catch (error) {
      console.error('❌ Manual testing failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async showUntestedCount() {
    try {
      console.log('🔍 Checking untested domains...\n');
      
      const categorizedDomains = await this.db.getDomainsByCategory();
      const neverTested = categorizedDomains.never_tested;
      
      console.log(`📊 Statistics:`);
      console.log(`🆕 Never tested: ${neverTested.length} domains`);
      console.log(`✅ Previously tested: ${631 - neverTested.length} domains`);
      console.log(`📈 Coverage: ${((631 - neverTested.length) / 631 * 100).toFixed(1)}%`);

      if (neverTested.length > 0) {
        console.log(`\n📋 Sample untested domains:`);
        console.log('---------------------------');
        neverTested.slice(0, 10).forEach((domain, index) => {
          console.log(`${index + 1}. ${domain.domain} (${domain.country})`);
        });
        
        if (neverTested.length > 10) {
          console.log(`   ... and ${neverTested.length - 10} more`);
        }
        
        console.log(`\n💡 Run 'npm run test-untested' to test 10 of these domains`);
      } else {
        console.log('\n🎉 All domains have been tested at least once!');
      }

    } catch (error) {
      console.error('❌ Failed to check untested domains:', error);
    } finally {
      this.db.close();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new ManualTester();

  if (args.includes('--count') || args.includes('--status')) {
    tester.showUntestedCount();
  } else {
    // Parse count argument
    let count = 10;
    const countArg = args.find(arg => arg.startsWith('--count='));
    if (countArg) {
      count = parseInt(countArg.split('=')[1]) || 10;
    }
    
    tester.testUntestedDomains(count);
  }
}

module.exports = ManualTester;