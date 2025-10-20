const Database = require('./database');
const fs = require('fs');
const path = require('path');

class WebsiteGenerator {
  constructor() {
    this.db = new Database();
    this.outputDir = './website';
    this.domainsData = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
  }

  getTrend(current, previous) {
    if (previous === null || previous === undefined) {
      return 'none'; // No previous data
    }
    
    const diff = current - previous;
    if (diff > 0) {
      return 'up';
    } else if (diff < 0) {
      return 'down';
    } else {
      return 'same';
    }
  }

  getTrendArrow(trend) {
    switch(trend) {
      case 'up':
        return '<span class="trend-arrow trend-up">↗</span>';
      case 'down':
        return '<span class="trend-arrow trend-down">↘</span>';
      case 'same':
      case 'none':
      default:
        return '';
    }
  }

  async generateWebsite() {
    console.log('🌐 Generating static website...');
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Generate all pages
    await this.generateHomePage();
    await this.generateCountryPages();
    await this.generateDomainPages();
    await this.generateAssets();

    console.log('✅ Static website generated successfully!');
    console.log(`📂 Website files are in: ${path.resolve(this.outputDir)}`);
    console.log(`🌐 Open: file://${path.resolve(this.outputDir)}/index.html`);
  }

  async generateHomePage() {
    const allScoresWithTrends = await this.db.getLatestScoresWithTrends();
    
    if (allScoresWithTrends.length === 0) {
      console.log('❌ No data found. Run lighthouse tests first.');
      return;
    }

    // Convert to the expected format and add trend information
    const allScores = allScoresWithTrends.map(row => ({
      url: row.url,
      country: row.country,
      performance: row.current_performance,
      accessibility: row.current_accessibility,
      best_practices: row.current_best_practices,
      seo: row.current_seo,
      pwa: row.current_pwa,
      test_date: row.test_date,
      // Trend data
      performance_trend: this.getTrend(row.current_performance, row.previous_performance),
      accessibility_trend: this.getTrend(row.current_accessibility, row.previous_accessibility),
      best_practices_trend: this.getTrend(row.current_best_practices, row.previous_best_practices),
      seo_trend: this.getTrend(row.current_seo, row.previous_seo),
      pwa_trend: this.getTrend(row.current_pwa, row.previous_pwa)
    }));

    // Calculate statistics
    const stats = this.calculateGlobalStats(allScores);
    const countryStats = this.calculateCountryStats(allScores);
    const topSites = allScores.sort((a, b) => b.performance - a.performance).slice(0, 10);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global Lighthouse Tracker</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🌍 Global Lighthouse Tracker</h1>
            <p class="subtitle">Performance insights from ${allScores.length} websites across ${this.domainsData.length} countries</p>
            <div class="last-updated">Last updated: ${new Date().toLocaleString()}</div>
        </header>

        <div class="stats-grid">
            <div class="stat-card performance">
                <h3>Global Performance</h3>
                <div class="stat-number">${stats.avgPerformance}%</div>
                <div class="stat-trend">📊 Average across all sites</div>
            </div>
            <div class="stat-card accessibility">
                <h3>Accessibility</h3>
                <div class="stat-number">${stats.avgAccessibility}%</div>
                <div class="stat-trend">♿ Global accessibility score</div>
            </div>
            <div class="stat-card seo">
                <h3>SEO Score</h3>
                <div class="stat-number">${stats.avgSeo}%</div>
                <div class="stat-trend">🔍 Search optimization</div>
            </div>
            <div class="stat-card best-practices">
                <h3>Best Practices</h3>
                <div class="stat-number">${stats.avgBestPractices}%</div>
                <div class="stat-trend">✨ Code quality standards</div>
            </div>
        </div>

        <div class="content-grid">
            <section class="section">
                <h2>🏆 Best & Worst Performing Countries</h2>
                <div class="country-comparison">
                    <div class="best-country">
                        <h3>🥇 Best: ${countryStats.best.name}</h3>
                        <div class="country-score">${countryStats.best.avgPerformance}%</div>
                        <p>Performance Leader</p>
                    </div>
                    <div class="worst-country">
                        <h3>🔄 Needs Improvement: ${countryStats.worst.name}</h3>
                        <div class="country-score">${countryStats.worst.avgPerformance}%</div>
                        <p>Growth Opportunity</p>
                    </div>
                </div>
            </section>

            <section class="section">
                <h2>🌍 Country Rankings</h2>
                <div class="country-grid">
                    ${countryStats.all.map((country, index) => `
                        <a href="country-${country.name.toLowerCase().replace(/\s+/g, '-')}.html" class="country-card">
                            <div class="country-rank">#${index + 1}</div>
                            <div class="country-flag">${this.getCountryFlag(country.name)}</div>
                            <h3>${country.name}</h3>
                            <div class="country-metrics">
                                <span class="metric">P: ${country.avgPerformance}%</span>
                                <span class="metric">A: ${country.avgAccessibility}%</span>
                                <span class="metric">SEO: ${country.avgSeo}%</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </section>
        </div>

        <section class="section">
            <h2>🏅 Global Top 10 Websites</h2>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search among all ${allScores.length} websites..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Website</th>
                            <th>Country</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Last Scanned</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${topSites.map((site, index) => `
                            <tr class="site-row" data-url="${site.url}" data-country="${this.normalizeCountry(site.country)}">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="domain-${site.url.replace(/\./g, '-')}.html" class="domain-link">${site.url}</a></td>
                                <td><a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html" class="country-link">${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}</a></td>
                                <td class="score perf-${this.getScoreClass(site.performance)}">${site.performance}% ${this.getTrendArrow(site.performance_trend)}</td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}">${site.accessibility}%</td>
                                <td class="score seo-${this.getScoreClass(site.seo)}">${site.seo}%</td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}">${site.best_practices}%</td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}">${site.pwa}%</td>
                                <td class="date">${new Date(site.test_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📊 Generated by Global Lighthouse Tracker | Data from ${allScores.length} websites across ${this.domainsData.length} countries</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    <script>
        // All sites data for search
        const allSites = ${JSON.stringify(allScores)};
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = allSites.filter(site => 
                site.url.toLowerCase().includes(query) || 
                site.country.toLowerCase().includes(query)
            );
            
            updateTable(filtered);
        });
        
        function updateTable(sites) {
            tableBody.innerHTML = sites.slice(0, 50).map((site, index) => \`
                <tr class="site-row" data-url="\${site.url}" data-country="\${normalizeCountry(site.country)}">
                    <td class="rank">#\${index + 1}</td>
                    <td><a href="domain-\${site.url.replace(/\\./g, '-')}.html" class="domain-link">\${site.url}</a></td>
                    <td><a href="country-\${normalizeCountry(site.country).toLowerCase().replace(/\\s+/g, '-')}.html" class="country-link">\${getCountryFlag(normalizeCountry(site.country))} \${normalizeCountry(site.country)}</a></td>
                    <td class="score perf-\${getScoreClass(site.performance)}">\${site.performance}%</td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}">\${site.accessibility}%</td>
                    <td class="score seo-\${getScoreClass(site.seo)}">\${site.seo}%</td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}">\${site.best_practices}%</td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}">\${site.pwa}%</td>
                    <td class="date">\${new Date(site.test_date).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        }
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }

        // Add country normalization function
        function normalizeCountry(country) {
            return country === 'Unknown' ? 'Global' : country;
        }

        // Add country flag function
        function getCountryFlag(country) {
            const flags = {
                'United States': '🇺🇸',
                'United Kingdom': '🇬🇧', 
                'Germany': '🇩🇪',
                'India': '🇮🇳',
                'Brazil': '🇧🇷',
                'Japan': '🇯🇵',
                'Canada': '🇨🇦',
                'Australia': '🇦🇺',
                'Russia': '🇷🇺',
                'South Korea': '🇰🇷',
                'Finland': '🇫🇮',
                'Global': '🌍'
            };
            return flags[country] || '🌍';
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'index.html'), html);
  }

  async generateCountryPages() {
    for (const countryData of this.domainsData) {
      const countryScores = await this.db.getScoresByCountry(countryData.country);
      
      if (countryScores.length === 0) continue;

      const fileName = `country-${countryData.country.toLowerCase().replace(/\s+/g, '-')}.html`;
      const stats = this.calculateCountrySpecificStats(countryScores);
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${countryData.country} - Lighthouse Tracker</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="breadcrumb">
                <a href="index.html">🏠 Home</a> > ${this.getCountryFlag(countryData.country)} ${countryData.country}
            </div>
            <h1>${this.getCountryFlag(countryData.country)} ${countryData.country} Performance</h1>
            <p class="subtitle">${countryScores.length} websites analyzed</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card performance">
                <h3>Average Performance</h3>
                <div class="stat-number">${stats.avgPerformance}%</div>
            </div>
            <div class="stat-card accessibility">
                <h3>Average Accessibility</h3>
                <div class="stat-number">${stats.avgAccessibility}%</div>
            </div>
            <div class="stat-card seo">
                <h3>Average SEO</h3>
                <div class="stat-number">${stats.avgSeo}%</div>
            </div>
            <div class="stat-card best-practices">
                <h3>Best Practices</h3>
                <div class="stat-number">${stats.avgBestPractices}%</div>
            </div>
        </div>

        <section class="section">
            <h2>🏅 Top Websites in ${countryData.country}</h2>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search ${countryData.country} websites..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Website</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Last Scanned</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${countryScores.map((site, index) => `
                            <tr class="site-row">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="domain-${site.url.replace(/\./g, '-')}.html" class="domain-link">${site.url}</a></td>
                                <td class="score perf-${this.getScoreClass(site.performance)}">${site.performance}%</td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}">${site.accessibility}%</td>
                                <td class="score seo-${this.getScoreClass(site.seo)}">${site.seo}%</td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}">${site.best_practices}%</td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}">${site.pwa}%</td>
                                <td class="date">${new Date(site.test_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📊 ${this.normalizeCountry(countryData.country)} Performance Data | ${countryScores.length} websites tested</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    <script>
        const countryData = ${JSON.stringify(countryScores)};
        
        document.getElementById('searchInput').addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = countryData.filter(site => 
                site.url.toLowerCase().includes(query)
            );
            
            document.getElementById('tableBody').innerHTML = filtered.map((site, index) => \`
                <tr class="site-row">
                    <td class="rank">#\${index + 1}</td>
                    <td><a href="domain-\${site.url.replace(/\\./g, '-')}.html" class="domain-link">\${site.url}</a></td>
                    <td class="score perf-\${getScoreClass(site.performance)}">\${site.performance}%</td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}">\${site.accessibility}%</td>
                    <td class="score seo-\${getScoreClass(site.seo)}">\${site.seo}%</td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}">\${site.best_practices}%</td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}">\${site.pwa}%</td>
                    <td class="date">\${new Date(site.test_date).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        });
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
    </script>
</body>
</html>`;

      fs.writeFileSync(path.join(this.outputDir, fileName), html);
    }

    // Generate Global page for Unknown countries
    const globalScores = await this.db.getScoresByCountry('Unknown');
    if (globalScores.length > 0) {
      const fileName = 'country-global.html';
      const stats = this.calculateCountrySpecificStats(globalScores);
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global - Lighthouse Tracker</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="breadcrumb">
                <a href="index.html">🏠 Home</a> > 🌍 Global
            </div>
            <h1>🌍 Global Performance</h1>
            <p class="subtitle">${globalScores.length} international websites analyzed</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card performance">
                <h3>Average Performance</h3>
                <div class="stat-number">${stats.avgPerformance}%</div>
            </div>
            <div class="stat-card accessibility">
                <h3>Average Accessibility</h3>
                <div class="stat-number">${stats.avgAccessibility}%</div>
            </div>
            <div class="stat-card seo">
                <h3>Average SEO</h3>
                <div class="stat-number">${stats.avgSeo}%</div>
            </div>
            <div class="stat-card best-practices">
                <h3>Best Practices</h3>
                <div class="stat-number">${stats.avgBestPractices}%</div>
            </div>
        </div>

        <section class="section">
            <h2>🏅 Top Global Websites</h2>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search global websites..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Website</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Last Scanned</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${globalScores.map((site, index) => `
                            <tr class="site-row">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="domain-${site.url.replace(/\./g, '-')}.html" class="domain-link">${site.url}</a></td>
                                <td class="score perf-${this.getScoreClass(site.performance)}">${site.performance}%</td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}">${site.accessibility}%</td>
                                <td class="score seo-${this.getScoreClass(site.seo)}">${site.seo}%</td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}">${site.best_practices}%</td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}">${site.pwa}%</td>
                                <td class="date">${new Date(site.test_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
    </div>

    <script>
        const countryData = ${JSON.stringify(globalScores)};
        
        document.getElementById('searchInput').addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = countryData.filter(site => 
                site.url.toLowerCase().includes(query)
            );
            
            document.getElementById('tableBody').innerHTML = filtered.map((site, index) => \`
                <tr class="site-row">
                    <td class="rank">#\${index + 1}</td>
                    <td><a href="domain-\${site.url.replace(/\\./g, '-')}.html" class="domain-link">\${site.url}</a></td>
                    <td class="score perf-\${getScoreClass(site.performance)}">\${site.performance}%</td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}">\${site.accessibility}%</td>
                    <td class="score seo-\${getScoreClass(site.seo)}">\${site.seo}%</td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}">\${site.best_practices}%</td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}">\${site.pwa}%</td>
                    <td class="date">\${new Date(site.test_date).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        });
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
    </script>
</body>
</html>`;

      fs.writeFileSync(path.join(this.outputDir, fileName), html);
    }
  }

  async generateDomainPages() {
    const allScores = await this.db.getAllLatestScores();
    
    for (const site of allScores) {
      const domainHistory = await this.db.getScores(site.url, 50);
      const fileName = `domain-${site.url.replace(/\./g, '-')}.html`;
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.url} - Lighthouse History</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="breadcrumb">
                <a href="index.html">🏠 Home</a> > 
                <a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html">${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}</a> > 
                ${site.url}
            </div>
            <h1>📊 ${site.url}</h1>
            <p class="subtitle">Performance history and insights</p>
            <div class="domain-info">
                <span class="country-tag">${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}</span>
                <span class="last-scan">Last scanned: ${new Date(site.test_date).toLocaleString()}</span>
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card performance">
                <h3>Performance</h3>
                <div class="stat-number ${this.getScoreClass(site.performance)}">${site.performance}%</div>
                <div class="stat-description">${this.getScoreDescription(site.performance, 'performance')}</div>
            </div>
            <div class="stat-card accessibility">
                <h3>Accessibility</h3>
                <div class="stat-number ${this.getScoreClass(site.accessibility)}">${site.accessibility}%</div>
                <div class="stat-description">${this.getScoreDescription(site.accessibility, 'accessibility')}</div>
            </div>
            <div class="stat-card seo">
                <h3>SEO</h3>
                <div class="stat-number ${this.getScoreClass(site.seo)}">${site.seo}%</div>
                <div class="stat-description">${this.getScoreDescription(site.seo, 'SEO')}</div>
            </div>
            <div class="stat-card best-practices">
                <h3>Best Practices</h3>
                <div class="stat-number ${this.getScoreClass(site.best_practices)}">${site.best_practices}%</div>
                <div class="stat-description">${this.getScoreDescription(site.best_practices, 'practices')}</div>
            </div>
        </div>

        ${domainHistory.length > 1 ? `
        <section class="section">
            <h2>📈 Performance History</h2>
            <div class="chart-container">
                <canvas id="historyChart"></canvas>
            </div>
        </section>
        ` : `
        <section class="section">
            <div class="no-history">
                <h2>📈 Performance History</h2>
                <p>No historical data available yet. Run more tests to see trends over time.</p>
            </div>
        </section>
        `}

        <section class="section">
            <h2>📋 Detailed Scores</h2>
            <div class="score-breakdown">
                <div class="score-item">
                    <span class="score-label">Performance:</span>
                    <div class="score-bar">
                        <div class="score-fill performance" style="width: ${site.performance}%"></div>
                        <span class="score-text">${site.performance}%</span>
                    </div>
                </div>
                <div class="score-item">
                    <span class="score-label">Accessibility:</span>
                    <div class="score-bar">
                        <div class="score-fill accessibility" style="width: ${site.accessibility}%"></div>
                        <span class="score-text">${site.accessibility}%</span>
                    </div>
                </div>
                <div class="score-item">
                    <span class="score-label">Best Practices:</span>
                    <div class="score-bar">
                        <div class="score-fill best-practices" style="width: ${site.best_practices}%"></div>
                        <span class="score-text">${site.best_practices}%</span>
                    </div>
                </div>
                <div class="score-item">
                    <span class="score-label">SEO:</span>
                    <div class="score-bar">
                        <div class="score-fill seo" style="width: ${site.seo}%"></div>
                        <span class="score-text">${site.seo}%</span>
                    </div>
                </div>
                <div class="score-item">
                    <span class="score-label">PWA:</span>
                    <div class="score-bar">
                        <div class="score-fill pwa" style="width: ${site.pwa}%"></div>
                        <span class="score-text">${site.pwa}%</span>
                    </div>
                </div>
            </div>
        </section>

        <footer class="footer">
            <p>📊 ${site.url} Performance History | Last tested: ${new Date(site.test_date).toLocaleDateString()}</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    ${domainHistory.length > 1 ? `
    <script>
        const historyData = ${JSON.stringify(domainHistory.reverse())};
        
        const ctx = document.getElementById('historyChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: historyData.map(d => new Date(d.test_date).toLocaleDateString()),
                datasets: [{
                    label: 'Performance',
                    data: historyData.map(d => d.performance),
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Accessibility',
                    data: historyData.map(d => d.accessibility),
                    borderColor: '#4285f4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    tension: 0.1
                }, {
                    label: 'SEO',
                    data: historyData.map(d => d.seo),
                    borderColor: '#34a853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Lighthouse Scores Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    </script>
    ` : ''}
</body>
</html>`;

      fs.writeFileSync(path.join(this.outputDir, fileName), html);
    }
  }

  async generateAssets() {
    const css = `
/* Facebook-inspired design */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f0f2f5;
    color: #1c1e21;
    line-height: 1.34;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px;
    margin: -20px -20px 20px -20px;
    border-radius: 0 0 16px 16px;
    color: white;
    text-align: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.header h1 {
    font-size: 2.5em;
    font-weight: 700;
    margin-bottom: 10px;
}

.subtitle {
    font-size: 1.2em;
    opacity: 0.9;
    margin-bottom: 15px;
}

.last-updated {
    font-size: 0.9em;
    opacity: 0.8;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 20px;
    display: inline-block;
}

.breadcrumb {
    margin-bottom: 20px;
    font-size: 0.9em;
    opacity: 0.8;
}

.breadcrumb a {
    color: white;
    text-decoration: none;
    transition: opacity 0.2s;
}

.breadcrumb a:hover {
    opacity: 0.7;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
    border-left: 4px solid;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-card.performance { border-left-color: #ff6b35; }
.stat-card.accessibility { border-left-color: #4285f4; }
.stat-card.seo { border-left-color: #34a853; }
.stat-card.best-practices { border-left-color: #9c27b0; }

.stat-card h3 {
    font-size: 0.9em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #65676b;
    margin-bottom: 10px;
}

.stat-number {
    font-size: 2.5em;
    font-weight: 700;
    margin-bottom: 5px;
}

.stat-trend {
    font-size: 0.85em;
    color: #65676b;
}

.content-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 30px;
    margin-bottom: 30px;
}

.section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
}

.section h2 {
    font-size: 1.5em;
    font-weight: 700;
    margin-bottom: 20px;
    color: #1c1e21;
}

.country-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.best-country, .worst-country {
    text-align: center;
    padding: 20px;
    border-radius: 8px;
}

.best-country {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.worst-country {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
}

.country-score {
    font-size: 2em;
    font-weight: 700;
    margin: 10px 0;
}

.country-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.country-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    border: 2px solid transparent;
    position: relative;
    overflow: hidden;
}

.country-card:hover {
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #1877f2;
    transform: translateY(-2px);
}

.country-rank {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #1877f2;
    color: white;
    font-size: 0.8em;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 600;
}

.country-flag {
    font-size: 2em;
    margin-bottom: 10px;
}

.country-card h3 {
    font-size: 1em;
    margin-bottom: 10px;
    font-weight: 600;
}

.country-metrics {
    display: flex;
    justify-content: space-around;
    font-size: 0.8em;
}

.metric {
    background: #e4e6ea;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.search-container {
    margin-bottom: 20px;
}

#searchInput {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e4e6ea;
    border-radius: 24px;
    font-size: 1em;
    transition: border-color 0.2s;
    outline: none;
}

#searchInput:focus {
    border-color: #1877f2;
}

.table-container {
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}

.results-table th {
    background: #f8f9fa;
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 0.9em;
    color: #65676b;
    border-bottom: 2px solid #e4e6ea;
}

.results-table td {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
}

.site-row:hover {
    background: #f8f9fa;
}

.rank {
    font-weight: 700;
    color: #1877f2;
    width: 60px;
}

.domain-link {
    color: #1877f2;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
}

.domain-link:hover {
    color: #166fe5;
    text-decoration: underline;
}

.country-link {
    color: #65676b;
    text-decoration: none;
    transition: color 0.2s;
}

.country-link:hover {
    color: #1877f2;
}

.score {
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 6px;
    text-align: center;
    min-width: 60px;
}

.score.excellent { background: #d4edda; color: #155724; }
.score.good { background: #d1ecf1; color: #0c5460; }
.score.average { background: #fff3cd; color: #856404; }
.score.poor { background: #f8d7da; color: #721c24; }

.date {
    color: #65676b;
    font-size: 0.9em;
}

.footer {
    text-align: center;
    padding: 20px;
    color: #65676b;
    font-size: 0.9em;
}

.footer p {
    margin: 5px 0;
}

.footer a {
    color: #1877f2;
    text-decoration: none;
    font-weight: 500;
}

.footer a:hover {
    text-decoration: underline;
}

/* Domain page specific styles */
.domain-info {
    display: flex;
    align-items: center;
    gap: 20px;
    justify-content: center;
    margin-top: 15px;
}

.country-tag {
    background: rgba(255, 255, 255, 0.2);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 0.9em;
}

.last-scan {
    font-size: 0.9em;
    opacity: 0.8;
}

.stat-description {
    font-size: 0.8em;
    opacity: 0.8;
    margin-top: 5px;
}

.chart-container {
    position: relative;
    height: 400px;
    margin: 20px 0;
}

.score-breakdown {
    display: grid;
    gap: 15px;
}

.score-item {
    display: flex;
    align-items: center;
    gap: 15px;
}

.score-label {
    min-width: 120px;
    font-weight: 600;
}

.score-bar {
    flex: 1;
    height: 30px;
    background: #f0f0f0;
    border-radius: 15px;
    position: relative;
    overflow: hidden;
}

.score-fill {
    height: 100%;
    border-radius: 15px;
    transition: width 0.3s ease;
    position: relative;
}

.score-fill.performance { background: linear-gradient(90deg, #ff6b35, #f7931e); }
.score-fill.accessibility { background: linear-gradient(90deg, #4285f4, #34a853); }
.score-fill.best-practices { background: linear-gradient(90deg, #9c27b0, #673ab7); }
.score-fill.seo { background: linear-gradient(90deg, #34a853, #0f9d58); }
.score-fill.pwa { background: linear-gradient(90deg, #ff9800, #ff5722); }

.score-text {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.no-history {
    text-align: center;
    padding: 40px;
    color: #65676b;
}

/* Responsive design */
@media (max-width: 768px) {
    .content-grid {
        grid-template-columns: 1fr;
    }
    
    .country-comparison {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    
    .header {
        padding: 20px;
    }
    
    .header h1 {
        font-size: 2em;
    }
    
    .results-table {
        font-size: 0.9em;
    }
    
    .results-table th,
    .results-table td {
        padding: 8px 6px;
    }
}

/* Trend arrows */
.trend-arrow {
    font-size: 0.9em;
    font-weight: bold;
    margin-left: 4px;
    display: inline-block;
    transform: translateY(-1px);
}

.trend-up {
    color: #42b883;
}

.trend-down {
    color: #e74c3c;
}
`;

    fs.writeFileSync(path.join(this.outputDir, 'styles.css'), css);
  }

  calculateGlobalStats(allScores) {
    return {
      avgPerformance: Math.round(allScores.reduce((sum, s) => sum + s.performance, 0) / allScores.length),
      avgAccessibility: Math.round(allScores.reduce((sum, s) => sum + s.accessibility, 0) / allScores.length),
      avgSeo: Math.round(allScores.reduce((sum, s) => sum + s.seo, 0) / allScores.length),
      avgBestPractices: Math.round(allScores.reduce((sum, s) => sum + s.best_practices, 0) / allScores.length),
      avgPwa: Math.round(allScores.reduce((sum, s) => sum + s.pwa, 0) / allScores.length)
    };
  }

  calculateCountryStats(allScores) {
    const byCountry = {};
    
    allScores.forEach(score => {
      const normalizedCountry = this.normalizeCountry(score.country);
      if (!byCountry[normalizedCountry]) {
        byCountry[normalizedCountry] = [];
      }
      byCountry[normalizedCountry].push(score);
    });

    const countryAverages = Object.keys(byCountry).map(country => {
      const scores = byCountry[country];
      return {
        name: country,
        avgPerformance: Math.round(scores.reduce((sum, s) => sum + s.performance, 0) / scores.length),
        avgAccessibility: Math.round(scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length),
        avgSeo: Math.round(scores.reduce((sum, s) => sum + s.seo, 0) / scores.length),
        count: scores.length
      };
    }).sort((a, b) => b.avgPerformance - a.avgPerformance);

    return {
      best: countryAverages[0],
      worst: countryAverages[countryAverages.length - 1],
      all: countryAverages
    };
  }

  calculateCountrySpecificStats(countryScores) {
    return {
      avgPerformance: Math.round(countryScores.reduce((sum, s) => sum + s.performance, 0) / countryScores.length),
      avgAccessibility: Math.round(countryScores.reduce((sum, s) => sum + s.accessibility, 0) / countryScores.length),
      avgSeo: Math.round(countryScores.reduce((sum, s) => sum + s.seo, 0) / countryScores.length),
      avgBestPractices: Math.round(countryScores.reduce((sum, s) => sum + s.best_practices, 0) / countryScores.length)
    };
  }

  normalizeCountry(country) {
    return country === 'Unknown' ? 'Global' : country;
  }

  getCountryFlag(country) {
    const normalizedCountry = this.normalizeCountry(country);
    const flags = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'India': '🇮🇳',
      'Brazil': '🇧🇷',
      'Japan': '🇯🇵',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Russia': '🇷🇺',
      'South Korea': '🇰🇷',
      'Finland': '🇫🇮',
      'Global': '🌍',
      'Unknown': '🌍'
    };
    return flags[normalizedCountry] || '🌍';
  }

  getCountryFlagJS() {
    return `getCountryFlag(site.country)`;
  }

  getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  getScoreDescription(score, type) {
    const descriptions = {
      performance: {
        excellent: 'Lightning fast! 🚀',
        good: 'Great performance ✨',
        average: 'Room for improvement',
        poor: 'Needs optimization'
      },
      accessibility: {
        excellent: 'Fully accessible ♿',
        good: 'Well accessible 👍',
        average: 'Some barriers exist',
        poor: 'Accessibility issues'
      },
      SEO: {
        excellent: 'SEO champion! 🏆',
        good: 'Well optimized 📈',
        average: 'Basic SEO setup',
        poor: 'SEO needs work'
      },
      practices: {
        excellent: 'Best practices! ✨',
        good: 'Good standards 👍',
        average: 'Some improvements',
        poor: 'Standards need work'
      }
    };

    const scoreClass = this.getScoreClass(score);
    return descriptions[type][scoreClass] || 'Score available';
  }
}

// Main execution
async function main() {
  const generator = new WebsiteGenerator();
  await generator.generateWebsite();
}

main().catch(console.error);