const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database('./lighthouse_scores.db');
    this.init();
  }

  init() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS lighthouse_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        country TEXT NOT NULL,
        performance INTEGER,
        accessibility INTEGER,
        best_practices INTEGER,
        seo INTEGER,
        pwa INTEGER,
        test_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createFailedTable = `
      CREATE TABLE IF NOT EXISTS lighthouse_failed_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        failure_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(createTable, (err) => {
      if (err) {
        console.error('Error creating lighthouse_scores table:', err);
      } else {
        console.log('lighthouse_scores table initialized successfully');
      }
    });
    
    this.db.run(createFailedTable, (err) => {
      if (err) {
        console.error('Error creating lighthouse_failed_tests table:', err);
      } else {
        console.log('lighthouse_failed_tests table initialized successfully');
      }
    });
  }

  saveScore(url, country, industry, scores) {
    return new Promise((resolve, reject) => {
      const performance = scores.performance || 0;
      const accessibility = scores.accessibility || 0;
      const bestPractices = scores.bestPractices || 0;
      const seo = scores.seo || 0;
      const pwa = scores.pwa || 0;
      
      // Check if test failed (all scores are 0)
      if (performance === 0 && accessibility === 0 && bestPractices === 0 && seo === 0 && pwa === 0) {
        console.log(`⚠️ Test failed for ${url} - recording failure and skipping save`);
        this.saveFailedTest(url).then(() => {
          resolve(null); // Return null to indicate no save occurred
        }).catch(reject);
        return;
      }
      
      const stmt = this.db.prepare(`
        INSERT INTO lighthouse_scores 
        (url, country, industry, performance, accessibility, best_practices, seo, pwa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        url,
        country,
        industry,
        performance,
        accessibility,
        bestPractices,
        seo,
        pwa
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  getScores(url, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM lighthouse_scores 
         WHERE url = ? 
         ORDER BY test_date DESC 
         LIMIT ?`,
        [url, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getAllLatestScores() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
        FROM lighthouse_scores ls1
        WHERE test_date = (
          SELECT MAX(test_date) 
          FROM lighthouse_scores ls2 
          WHERE ls2.url = ls1.url
        )
        ORDER BY country, url
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getScoresByCountry(country) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
        FROM lighthouse_scores ls1
        WHERE country = ? AND test_date = (
          SELECT MAX(test_date) 
          FROM lighthouse_scores ls2 
          WHERE ls2.url = ls1.url
        )
        ORDER BY performance DESC
      `, [country], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  deleteByCountry(country) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM lighthouse_scores 
        WHERE country = ?
      `, [country], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getLatestScoresWithTrends() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          latest.url,
          latest.country,
          latest.industry,
          latest.performance as current_performance,
          latest.accessibility as current_accessibility,
          latest.best_practices as current_best_practices,
          latest.seo as current_seo,
          latest.pwa as current_pwa,
          latest.test_date,
          previous.performance as previous_performance,
          previous.accessibility as previous_accessibility,
          previous.best_practices as previous_best_practices,
          previous.seo as previous_seo,
          previous.pwa as previous_pwa
        FROM (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores ls1
          WHERE test_date = (
            SELECT MAX(test_date) 
            FROM lighthouse_scores ls2 
            WHERE ls2.url = ls1.url
          )
        ) latest
        LEFT JOIN (
          SELECT url, performance, accessibility, best_practices, seo, pwa, test_date,
                 ROW_NUMBER() OVER (PARTITION BY url ORDER BY test_date DESC) as rn
          FROM lighthouse_scores
        ) previous ON latest.url = previous.url AND previous.rn = 2
        ORDER BY latest.country, latest.url
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  removeZeroScoreEntries() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM lighthouse_scores 
        WHERE performance = 0 AND accessibility = 0 AND best_practices = 0 AND seo = 0 AND pwa = 0
      `, function(err) {
        if (err) reject(err);
        else {
          console.log(`🧹 Removed ${this.changes} zero-score entries from database`);
          resolve(this.changes);
        }
      });
    });
  }

  getLatestScanResults() {
    return new Promise((resolve, reject) => {
      // First get the most recent test_date across all records
      this.db.get(`
        SELECT MAX(test_date) as latest_date
        FROM lighthouse_scores
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row || !row.latest_date) {
          resolve([]);
          return;
        }
        
        // Then get all records from that latest scan date
        this.db.all(`
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores
          WHERE test_date = ?
          ORDER BY performance DESC, url ASC
        `, [row.latest_date], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    });
  }

  getScoresWithTrendsForCountry(country) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH ranked_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date,
                 ROW_NUMBER() OVER (PARTITION BY url ORDER BY test_date DESC) as rn
          FROM lighthouse_scores 
          WHERE country = ?
        ),
        latest_scores AS (
          SELECT * FROM ranked_scores WHERE rn = 1
        ),
        previous_scores AS (
          SELECT * FROM ranked_scores WHERE rn = 2
        )
        SELECT 
          l.url, l.country, l.industry, l.test_date,
          l.performance as current_performance,
          l.accessibility as current_accessibility, 
          l.best_practices as current_best_practices,
          l.seo as current_seo,
          l.pwa as current_pwa,
          p.performance as previous_performance,
          p.accessibility as previous_accessibility,
          p.best_practices as previous_best_practices, 
          p.seo as previous_seo,
          p.pwa as previous_pwa
        FROM latest_scores l
        LEFT JOIN previous_scores p ON l.url = p.url
        ORDER BY l.performance DESC
      `, [country], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getScoresWithTrendsForIndustry(industry) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH ranked_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date,
                 ROW_NUMBER() OVER (PARTITION BY url ORDER BY test_date DESC) as rn
          FROM lighthouse_scores 
          WHERE industry = ?
        ),
        latest_scores AS (
          SELECT * FROM ranked_scores WHERE rn = 1
        ),
        previous_scores AS (
          SELECT * FROM ranked_scores WHERE rn = 2
        )
        SELECT 
          l.url, l.country, l.industry, l.test_date,
          l.performance as current_performance,
          l.accessibility as current_accessibility, 
          l.best_practices as current_best_practices,
          l.seo as current_seo,
          l.pwa as current_pwa,
          p.performance as previous_performance,
          p.accessibility as previous_accessibility,
          p.best_practices as previous_best_practices, 
          p.seo as previous_seo,
          p.pwa as previous_pwa
        FROM latest_scores l
        LEFT JOIN previous_scores p ON l.url = p.url
        ORDER BY l.performance DESC
      `, [industry], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getRecentScanResults() {
    return new Promise((resolve, reject) => {
      // First get the most recent test_date
      this.db.get(`
        SELECT MAX(test_date) as latest_date
        FROM lighthouse_scores
      `, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row || !row.latest_date) {
          resolve([]);
          return;
        }
        
        // Get all records from the latest scan AND all records within 120 minutes before it
        // Use SQLite datetime functions for reliable date arithmetic
        this.db.all(`
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date,
                 CASE 
                   WHEN test_date = ? THEN 'latest'
                   ELSE 'recent'
                 END as scan_type
          FROM lighthouse_scores
          WHERE test_date >= datetime(?, '-120 minutes') AND test_date <= ?
          ORDER BY test_date DESC, performance DESC, url ASC
        `, [row.latest_date, row.latest_date, row.latest_date], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    });
  }

  saveFailedTest(url) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO lighthouse_failed_tests (url)
        VALUES (?)
      `);
      
      stmt.run([url], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      
      stmt.finalize();
    });
  }

  getFailedTests(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM lighthouse_failed_tests 
         ORDER BY failure_timestamp DESC 
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getFailedTestsCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM lighthouse_failed_tests`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  getFailedTestsByUrl(url) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM lighthouse_failed_tests 
         WHERE url = ? 
         ORDER BY failure_timestamp DESC`,
        [url],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getFailedTestsStats() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT url, COUNT(*) as failure_count, 
                MAX(failure_timestamp) as last_failure,
                MIN(failure_timestamp) as first_failure
         FROM lighthouse_failed_tests 
         GROUP BY url 
         ORDER BY failure_count DESC, last_failure DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Domain prioritization methods for smart batch testing
  getDomainsByCategory() {
    return new Promise((resolve, reject) => {
      // Get all domains from domains.json with their test history
      const fs = require('fs');
      let allDomains = [];
      
      try {
        const domainsData = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
        for (const countryData of domainsData) {
          for (const domainInfo of countryData.top_domains) {
            allDomains.push({
              domain: domainInfo.domain,
              country: countryData.country,
              industry: domainInfo.industry
            });
          }
        }
      } catch (error) {
        reject(new Error('Failed to load domains.json: ' + error.message));
        return;
      }

      // Complex query to categorize all domains
      const query = `
        WITH domain_stats AS (
          SELECT 
            url,
            COUNT(*) as total_tests,
            SUM(CASE WHEN performance > 0 OR accessibility > 0 OR best_practices > 0 OR seo > 0 OR pwa > 0 THEN 1 ELSE 0 END) as success_count,
            MAX(test_date) as last_test_date,
            MAX(CASE WHEN performance > 0 OR accessibility > 0 OR best_practices > 0 OR seo > 0 OR pwa > 0 THEN test_date END) as last_success_date
          FROM lighthouse_scores 
          GROUP BY url
        ),
        failure_stats AS (
          SELECT 
            url,
            COUNT(*) as failure_count,
            MAX(failure_timestamp) as last_failure_date
          FROM lighthouse_failed_tests 
          GROUP BY url
        )
        SELECT 
          ? as domain,
          ? as country,
          ? as industry,
          COALESCE(ds.total_tests, 0) as total_tests,
          COALESCE(ds.success_count, 0) as success_count,
          COALESCE(fs.failure_count, 0) as failure_count,
          ds.last_test_date,
          ds.last_success_date,
          fs.last_failure_date,
          CASE 
            WHEN ds.total_tests IS NULL AND fs.failure_count IS NULL THEN 'never_tested'
            WHEN ds.success_count >= 3 AND ds.last_success_date >= datetime('now', '-7 days') THEN 'reliable_success'
            WHEN ds.success_count > 0 AND ds.last_success_date >= datetime('now', '-14 days') THEN 'recent_mixed'
            WHEN ds.success_count > 0 AND ds.last_success_date < datetime('now', '-14 days') THEN 'old_success'
            WHEN ds.success_count = 0 OR ds.last_success_date IS NULL OR ds.last_success_date < datetime('now', '-30 days') THEN 'failed_only'
            ELSE 'unknown'
          END as category,
          CASE 
            WHEN fs.last_failure_date IS NULL THEN 0
            WHEN fs.last_failure_date >= datetime('now', '-1 days') THEN 1
            WHEN fs.last_failure_date >= datetime('now', '-3 days') THEN 3
            WHEN fs.last_failure_date >= datetime('now', '-7 days') THEN 7
            ELSE 0
          END as cooldown_days_remaining
        FROM domain_stats ds
        FULL OUTER JOIN failure_stats fs ON ds.url = fs.url
      `;

      // Since SQLite doesn't support FULL OUTER JOIN easily, we'll do this in JavaScript
      // First get all tested domains
      this.db.all(`
        WITH domain_stats AS (
          SELECT 
            url,
            COUNT(*) as total_tests,
            SUM(CASE WHEN performance > 0 OR accessibility > 0 OR best_practices > 0 OR seo > 0 OR pwa > 0 THEN 1 ELSE 0 END) as success_count,
            MAX(test_date) as last_test_date,
            MAX(CASE WHEN performance > 0 OR accessibility > 0 OR best_practices > 0 OR seo > 0 OR pwa > 0 THEN test_date END) as last_success_date
          FROM lighthouse_scores 
          GROUP BY url
        ),
        failure_stats AS (
          SELECT 
            url,
            COUNT(*) as failure_count,
            MAX(failure_timestamp) as last_failure_date
          FROM lighthouse_failed_tests 
          GROUP BY url
        )
        SELECT 
          COALESCE(ds.url, fs.url) as domain,
          COALESCE(ds.total_tests, 0) as total_tests,
          COALESCE(ds.success_count, 0) as success_count,
          COALESCE(fs.failure_count, 0) as failure_count,
          ds.last_test_date,
          ds.last_success_date,
          fs.last_failure_date
        FROM domain_stats ds
        LEFT JOIN failure_stats fs ON ds.url = fs.url
        UNION
        SELECT 
          fs.url as domain,
          0 as total_tests,
          0 as success_count,
          fs.failure_count,
          NULL as last_test_date,
          NULL as last_success_date,
          fs.last_failure_date
        FROM failure_stats fs
        LEFT JOIN domain_stats ds ON fs.url = ds.url
        WHERE ds.url IS NULL
      `, (err, dbResults) => {
        if (err) {
          reject(err);
          return;
        }

        // Create a map of tested domains
        const testedDomains = new Map();
        dbResults.forEach(row => {
          testedDomains.set(row.domain, row);
        });

        // Categorize all domains
        const categorizedDomains = {
          never_tested: [],
          reliable_success: [],
          recent_mixed: [],
          old_success: [],
          failed_only: []
        };

        allDomains.forEach(domainInfo => {
          const dbData = testedDomains.get(domainInfo.domain);
          let category = 'never_tested';
          let cooldownDaysRemaining = 0;

          if (dbData) {
            const now = new Date();
            const lastSuccess = dbData.last_success_date ? new Date(dbData.last_success_date) : null;
            const lastFailure = dbData.last_failure_date ? new Date(dbData.last_failure_date) : null;
            const lastTest = dbData.last_test_date ? new Date(dbData.last_test_date) : null;

            // Calculate cooldown for failed domains
            if (lastFailure) {
              const daysSinceFailure = (now - lastFailure) / (1000 * 60 * 60 * 24);
              if (daysSinceFailure < 1) cooldownDaysRemaining = 1;
              else if (daysSinceFailure < 3) cooldownDaysRemaining = 3 - Math.floor(daysSinceFailure);
              else if (daysSinceFailure < 7) cooldownDaysRemaining = 7 - Math.floor(daysSinceFailure);
            }

            // Categorize based on success patterns and recency
            if (dbData.success_count >= 3 && lastSuccess && (now - lastSuccess) / (1000 * 60 * 60 * 24) <= 7) {
              category = 'reliable_success';
            } else if (dbData.success_count > 0 && lastSuccess && (now - lastSuccess) / (1000 * 60 * 60 * 24) <= 14) {
              category = 'recent_mixed';
            } else if (dbData.success_count > 0 && lastSuccess && (now - lastSuccess) / (1000 * 60 * 60 * 24) > 14) {
              category = 'old_success';
            } else if (dbData.success_count === 0 || !lastSuccess || (now - lastSuccess) / (1000 * 60 * 60 * 24) > 30) {
              category = 'failed_only';
            }
          }

          categorizedDomains[category].push({
            ...domainInfo,
            ...dbData,
            category,
            cooldownDaysRemaining
          });
        });

        resolve(categorizedDomains);
      });
    });
  }

  getSmartBatch(batchSize = 50, percentages = { never_tested: 70, reliable_success: 10, recent_mixed: 10, old_success: 5, failed_only: 5 }) {
    return new Promise(async (resolve, reject) => {
      try {
        const categorizedDomains = await this.getDomainsByCategory();
        
        // Filter out domains in cooldown period
        const availableDomains = {
          never_tested: categorizedDomains.never_tested,
          reliable_success: categorizedDomains.reliable_success.filter(d => d.cooldownDaysRemaining === 0),
          recent_mixed: categorizedDomains.recent_mixed.filter(d => d.cooldownDaysRemaining === 0),
          old_success: categorizedDomains.old_success.filter(d => d.cooldownDaysRemaining === 0),
          failed_only: categorizedDomains.failed_only.filter(d => d.cooldownDaysRemaining === 0)
        };

        // Calculate actual allocation based on available domains
        const allocation = this.calculateAdaptiveAllocation(availableDomains, batchSize, percentages);
        
        // Select domains for each category
        const selectedDomains = [];
        
        for (const [category, count] of Object.entries(allocation)) {
          if (count > 0 && availableDomains[category].length > 0) {
            // Randomly shuffle and take the required count
            const shuffled = [...availableDomains[category]].sort(() => Math.random() - 0.5);
            selectedDomains.push(...shuffled.slice(0, count));
          }
        }

        // If we don't have enough domains, fill with whatever is available
        if (selectedDomains.length < batchSize) {
          const remaining = batchSize - selectedDomains.length;
          const allAvailable = Object.values(availableDomains).flat();
          const usedDomains = new Set(selectedDomains.map(d => d.domain));
          const unused = allAvailable.filter(d => !usedDomains.has(d.domain));
          
          if (unused.length > 0) {
            const shuffled = unused.sort(() => Math.random() - 0.5);
            selectedDomains.push(...shuffled.slice(0, remaining));
          }
        }

        resolve({
          selectedDomains: selectedDomains.slice(0, batchSize),
          allocation,
          availableCounts: Object.fromEntries(
            Object.entries(availableDomains).map(([k, v]) => [k, v.length])
          ),
          cooldownCounts: Object.fromEntries(
            Object.entries(categorizedDomains).map(([k, v]) => [k, v.filter(d => d.cooldownDaysRemaining > 0).length])
          )
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  calculateAdaptiveAllocation(availableDomains, batchSize, originalPercentages) {
    const allocation = {};
    let totalAllocated = 0;

    // Calculate initial allocation
    for (const [category, percentage] of Object.entries(originalPercentages)) {
      const requestedCount = Math.floor((percentage / 100) * batchSize);
      const availableCount = availableDomains[category]?.length || 0;
      allocation[category] = Math.min(requestedCount, availableCount);
      totalAllocated += allocation[category];
    }

    // If we have remaining slots, redistribute
    const remaining = batchSize - totalAllocated;
    if (remaining > 0) {
      // Redistribute to categories with available domains, prioritizing never_tested first
      const priorityOrder = ['never_tested', 'reliable_success', 'recent_mixed', 'old_success', 'failed_only'];
      
      for (const category of priorityOrder) {
        if (remaining <= 0) break;
        
        const available = (availableDomains[category]?.length || 0) - allocation[category];
        const canAdd = Math.min(remaining, available);
        allocation[category] += canAdd;
        totalAllocated += canAdd;
      }
    }

    return allocation;
  }

  // Statistics methods for stats page
  getGlobalStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH latest_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores ls1
          WHERE test_date = (
            SELECT MAX(test_date) 
            FROM lighthouse_scores ls2 
            WHERE ls2.url = ls1.url
          )
        )
        SELECT 
          COUNT(*) as total_sites,
          COUNT(DISTINCT country) as total_countries,
          COUNT(DISTINCT industry) as total_industries,
          ROUND(AVG(performance), 1) as avg_performance,
          ROUND(AVG(accessibility), 1) as avg_accessibility,
          ROUND(AVG(best_practices), 1) as avg_best_practices,
          ROUND(AVG(seo), 1) as avg_seo,
          ROUND(AVG(pwa), 1) as avg_pwa,
          MIN(performance) as min_performance,
          MAX(performance) as max_performance,
          COUNT(CASE WHEN performance >= 90 THEN 1 END) as excellent_performance_count,
          COUNT(CASE WHEN performance >= 50 AND performance < 90 THEN 1 END) as good_performance_count,
          COUNT(CASE WHEN performance < 50 THEN 1 END) as poor_performance_count
        FROM latest_scores
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0] || {});
      });
    });
  }

  getCountryStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH latest_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores ls1
          WHERE test_date = (
            SELECT MAX(test_date) 
            FROM lighthouse_scores ls2 
            WHERE ls2.url = ls1.url
          )
        )
        SELECT 
          country,
          COUNT(*) as site_count,
          ROUND(AVG(performance), 1) as avg_performance,
          ROUND(AVG(accessibility), 1) as avg_accessibility,
          ROUND(AVG(best_practices), 1) as avg_best_practices,
          ROUND(AVG(seo), 1) as avg_seo,
          ROUND(AVG(pwa), 1) as avg_pwa,
          MAX(performance) as best_performance,
          MIN(performance) as worst_performance
        FROM latest_scores
        GROUP BY country
        ORDER BY avg_performance DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getIndustryStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH latest_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores ls1
          WHERE test_date = (
            SELECT MAX(test_date) 
            FROM lighthouse_scores ls2 
            WHERE ls2.url = ls1.url
          )
        )
        SELECT 
          industry,
          COUNT(*) as site_count,
          ROUND(AVG(performance), 1) as avg_performance,
          ROUND(AVG(accessibility), 1) as avg_accessibility,
          ROUND(AVG(best_practices), 1) as avg_best_practices,
          ROUND(AVG(seo), 1) as avg_seo,
          ROUND(AVG(pwa), 1) as avg_pwa,
          MAX(performance) as best_performance,
          MIN(performance) as worst_performance
        FROM latest_scores
        GROUP BY industry
        ORDER BY avg_performance DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getPerformanceTrends() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          DATE(test_date) as test_date,
          ROUND(AVG(performance), 1) as avg_performance,
          ROUND(AVG(accessibility), 1) as avg_accessibility,
          ROUND(AVG(best_practices), 1) as avg_best_practices,
          ROUND(AVG(seo), 1) as avg_seo,
          ROUND(AVG(pwa), 1) as avg_pwa,
          COUNT(*) as sites_tested
        FROM lighthouse_scores
        WHERE test_date >= DATE('now', '-30 days')
        GROUP BY DATE(test_date)
        ORDER BY test_date ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getBestAndWorstSites() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        WITH latest_scores AS (
          SELECT url, country, industry, performance, accessibility, best_practices, seo, pwa, test_date
          FROM lighthouse_scores ls1
          WHERE test_date = (
            SELECT MAX(test_date) 
            FROM lighthouse_scores ls2 
            WHERE ls2.url = ls1.url
          )
        ),
        overall_scores AS (
          SELECT 
            url, country, industry, performance, accessibility, best_practices, seo, pwa,
            ROUND((performance + accessibility + best_practices + seo + pwa) / 5.0, 1) as overall_score
          FROM latest_scores
        ),
        best_sites AS (
          SELECT 
            'best' as category,
            url, country, industry, performance, accessibility, best_practices, seo, pwa, overall_score
          FROM overall_scores
          ORDER BY overall_score DESC, performance DESC
          LIMIT 10
        ),
        worst_sites AS (
          SELECT 
            'worst' as category,
            url, country, industry, performance, accessibility, best_practices, seo, pwa, overall_score
          FROM overall_scores
          ORDER BY overall_score ASC, performance ASC
          LIMIT 10
        )
        SELECT * FROM best_sites
        UNION ALL
        SELECT * FROM worst_sites
      `, (err, rows) => {
        if (err) reject(err);
        else {
          const result = {
            best: rows.filter(r => r.category === 'best'),
            worst: rows.filter(r => r.category === 'worst')
          };
          resolve(result);
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;