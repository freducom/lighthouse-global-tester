#!/usr/bin/env node

const Database = require('./database.js');
const GlobalTester = require('./global-tester.js');

class SmartBatchTester {
  constructor() {
    this.db = new Database();
    this.tester = new GlobalTester();
  }

  async runSmartBatch(options = {}) {
    const {
      batchSize = 50,
      percentages = {
        never_tested: 70,
        reliable_success: 10,
        recent_mixed: 10,
        old_success: 5,
        failed_only: 5
      },
      dryRun = false
    } = options;

    try {
      console.log('🎯 Smart Batch Testing - Prioritized Domain Selection');
      console.log('====================================================\n');

      // Get smart batch selection
      console.log('📊 Analyzing domain categories and selecting batch...');
      const batchInfo = await this.db.getSmartBatch(batchSize, percentages);
      
      console.log('\n📈 Batch Allocation Summary:');
      console.log('----------------------------');
      
      Object.entries(batchInfo.allocation).forEach(([category, count]) => {
        const available = batchInfo.availableCounts[category] || 0;
        const cooldown = batchInfo.cooldownCounts[category] || 0;
        const emoji = this.getCategoryEmoji(category);
        const cooldownText = cooldown > 0 ? ` (${cooldown} in cooldown)` : '';
        
        console.log(`${emoji} ${category.replace(/_/g, ' ')}: ${count}/${available} domains${cooldownText}`);
      });

      console.log(`\n🎯 Total Selected: ${batchInfo.selectedDomains.length} domains`);
      
      if (batchInfo.selectedDomains.length === 0) {
        console.log('⚠️  No domains available for testing (all may be in cooldown)');
        return;
      }

      if (dryRun) {
        console.log('\n🔍 DRY RUN - Selected domains:');
        console.log('------------------------------');
        batchInfo.selectedDomains.forEach((domain, index) => {
          const emoji = this.getCategoryEmoji(domain.category);
          console.log(`${index + 1}. ${emoji} ${domain.domain} (${domain.country}, ${domain.category})`);
        });
        return;
      }

      // Run the actual tests
      console.log('\n🧪 Starting lighthouse tests...');
      console.log('================================\n');

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < batchInfo.selectedDomains.length; i++) {
        const domain = batchInfo.selectedDomains[i];
        const progress = `[${i + 1}/${batchInfo.selectedDomains.length}]`;
        const emoji = this.getCategoryEmoji(domain.category);
        
        console.log(`${progress} ${emoji} Testing ${domain.domain}...`);
        
        try {
          const result = await this.tester.testDomain(domain.domain, domain.country, domain.industry);
          
          if (result.failed) {
            failureCount++;
            console.log(`   ❌ Failed: ${result.errorMessage || 'Unknown error'}`);
          } else {
            successCount++;
            console.log(`   ✅ Success: P:${result.performance}% A:${result.accessibility}% SEO:${result.seo}%`);
          }
          
          results.push(result);
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failureCount++;
          console.log(`   ❌ Error: ${error.message}`);
          results.push({
            url: domain.domain,
            country: domain.country,
            industry: domain.industry,
            failed: true,
            errorMessage: error.message
          });
        }
      }

      // Summary
      console.log('\n📊 Batch Testing Complete!');
      console.log('==========================');
      console.log(`✅ Successful tests: ${successCount}`);
      console.log(`❌ Failed tests: ${failureCount}`);
      console.log(`🎯 Total tests: ${results.length}`);
      console.log(`📈 Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

      // Category breakdown
      const categoryResults = {};
      results.forEach(result => {
        const domain = batchInfo.selectedDomains.find(d => d.domain === result.url);
        if (domain) {
          if (!categoryResults[domain.category]) {
            categoryResults[domain.category] = { success: 0, failed: 0 };
          }
          if (result.failed) {
            categoryResults[domain.category].failed++;
          } else {
            categoryResults[domain.category].success++;
          }
        }
      });

      console.log('\n📈 Results by Category:');
      console.log('-----------------------');
      Object.entries(categoryResults).forEach(([category, stats]) => {
        const emoji = this.getCategoryEmoji(category);
        const total = stats.success + stats.failed;
        const successRate = total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0;
        console.log(`${emoji} ${category.replace(/_/g, ' ')}: ${stats.success}/${total} (${successRate}% success)`);
      });

      return results;

    } catch (error) {
      console.error('❌ Smart batch testing failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  getCategoryEmoji(category) {
    const emojis = {
      never_tested: '🆕',
      reliable_success: '✅',
      recent_mixed: '🔄',
      old_success: '⏰',
      failed_only: '❌'
    };
    return emojis[category] || '❓';
  }

  async showBatchPreview(batchSize = 50) {
    try {
      console.log('🔍 Smart Batch Preview');
      console.log('=====================\n');

      const batchInfo = await this.db.getSmartBatch(batchSize);
      
      console.log('📊 Available Domains by Category:');
      console.log('----------------------------------');
      
      Object.entries(batchInfo.availableCounts).forEach(([category, count]) => {
        const cooldown = batchInfo.cooldownCounts[category] || 0;
        const emoji = this.getCategoryEmoji(category);
        const cooldownText = cooldown > 0 ? ` (${cooldown} in cooldown)` : '';
        console.log(`${emoji} ${category.replace(/_/g, ' ')}: ${count} available${cooldownText}`);
      });

      console.log('\n🎯 Proposed Allocation:');
      console.log('------------------------');
      
      Object.entries(batchInfo.allocation).forEach(([category, count]) => {
        const emoji = this.getCategoryEmoji(category);
        console.log(`${emoji} ${category.replace(/_/g, ' ')}: ${count} domains`);
      });

      console.log(`\n📈 Total batch size: ${batchInfo.selectedDomains.length}/${batchSize}`);

    } catch (error) {
      console.error('❌ Preview failed:', error);
    } finally {
      this.db.close();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new SmartBatchTester();

  if (args.includes('--preview')) {
    const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50;
    tester.showBatchPreview(batchSize);
  } else if (args.includes('--dry-run')) {
    const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50;
    tester.runSmartBatch({ batchSize, dryRun: true });
  } else {
    const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50;
    tester.runSmartBatch({ batchSize });
  }
}

module.exports = SmartBatchTester;