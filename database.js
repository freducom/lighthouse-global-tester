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

  close() {
    this.db.close();
  }
}

module.exports = Database;