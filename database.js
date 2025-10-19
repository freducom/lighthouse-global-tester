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
      const stmt = this.db.prepare(`
        INSERT INTO lighthouse_scores 
        (url, country, performance, accessibility, best_practices, seo, pwa)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        url,
        country,
        scores.performance || 0,
        scores.accessibility || 0,
        scores.bestPractices || 0,
        scores.seo || 0,
        scores.pwa || 0
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
        SELECT url, country, performance, accessibility, best_practices, seo, pwa, test_date
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
        SELECT url, country, performance, accessibility, best_practices, seo, pwa, test_date
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

  close() {
    this.db.close();
  }
}

module.exports = Database;