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
    
    this.db.run(createTable, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Database initialized successfully');
      }
    });
  }

  saveScore(url, country, scores) {
    return new Promise((resolve, reject) => {
      const performance = scores.performance || 0;
      const accessibility = scores.accessibility || 0;
      const bestPractices = scores.bestPractices || 0;
      const seo = scores.seo || 0;
      const pwa = scores.pwa || 0;
      
      // Skip saving if all scores are 0 (failed test)
      if (performance === 0 && accessibility === 0 && bestPractices === 0 && seo === 0 && pwa === 0) {
        console.log(`⚠️ Skipping ${url} - all scores are 0 (test failed)`);
        resolve(null); // Return null to indicate no save occurred
        return;
      }
      
      const stmt = this.db.prepare(`
        INSERT INTO lighthouse_scores 
        (url, country, performance, accessibility, best_practices, seo, pwa)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        url,
        country,
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

  close() {
    this.db.close();
  }
}

module.exports = Database;