const Database = require('./database');
const fs = require('fs');
const path = require('path');

class WebsiteGenerator {
  constructor() {
    this.db = new Database();
    this.outputDir = './website';
    this.domainsData = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
  }

  getCountryFlag(country) {
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
      'Israel': '🇮🇱',
      'Netherlands': '🇳🇱',
      'Sweden': '🇸🇪',
      'Ireland': '🇮🇪',
      'Austria': '🇦🇹',
      'Poland': '🇵🇱',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Ukraine': '🇺🇦',
      'Hungary': '🇭🇺',
      'Estonia': '🇪🇪',
      'Lithuania': '🇱🇹',
      'Latvia': '🇱🇻',
      'Turkey': '🇹🇷',
      'Italy': '🇮🇹',
      'New Zealand': '🇳🇿',
      'South Africa': '🇿🇦',
      'Egypt': '🇪🇬',
      'Libya': '🇱🇾',
      'Iran': '🇮🇷',
      'Greece': '🇬🇷',
      'Spain': '🇪🇸',
      'France': '🇫🇷',
      'Belgium': '🇧🇪',
      'Luxembourg': '🇱🇺',
      'Switzerland': '🇨🇭',
      'Czechia': '🇨🇿',
      'Slovakia': '🇸🇰',
      'Malta': '🇲🇹',
      'China': '🇨🇳',
      'Vietnam': '🇻🇳',
      'Thailand': '🇹🇭',
      'Malaysia': '🇲🇾',
      'Singapore': '🇸🇬',
      'Indonesia': '🇮🇩',
      'Taiwan': '🇹🇼',
      'Peru': '🇵🇪',
      'Colombia': '🇨🇴',
      'Costa Rica': '🇨🇷',
      'Cuba': '🇨🇺',
      'Bolivia': '🇧🇴',
      'Chile': '🇨🇱',
      'Paraguay': '🇵🇾',
      'Uruguay': '🇺🇾',
      'Zambia': '🇿🇲',
      'Kenya': '🇰🇪',
      'Angola': '🇦🇴',
      'Namibia': '🇳🇦',
      'Global': '🌍'
    };
    return flags[country] || '🌍';
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

  getPerformanceDelta(current, previous) {
    if (previous === null || previous === undefined) {
      return { delta: 0, text: '', class: 'delta-neutral' };
    }
    
    const delta = current - previous;
    if (delta > 0) {
      return { delta, text: `+${delta}`, class: 'delta-positive' };
    } else if (delta < 0) {
      return { delta, text: `${delta}`, class: 'delta-negative' };
    } else {
      return { delta: 0, text: '±0', class: 'delta-neutral' };
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
    await this.generateIndustryPages();
    await this.generateDomainPages();
    await this.generateAllCountriesPage();
    await this.generateAllIndustriesPage();
    await this.generateAllCompaniesPage();
    await this.generateLatestUpdatedPage();
    await this.generateAssets();

    console.log('✅ Static website generated successfully!');
    console.log(`📂 Website files are in: ${path.resolve(this.outputDir)}`);
    console.log(`🌐 Open: file://${path.resolve(this.outputDir)}/index.html`);
  }

  async generateHomePage() {
    const generationTime = new Date().toISOString(); // Capture actual generation time
    const allScoresWithTrends = await this.db.getLatestScoresWithTrends();
    
    if (allScoresWithTrends.length === 0) {
      console.log('❌ No data found. Run lighthouse tests first.');
      return;
    }

    // Convert to the expected format and add trend information
    const allScores = allScoresWithTrends.map(row => ({
      url: row.url,
      country: row.country,
      industry: row.industry,
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
    const industryStats = this.calculateIndustryStats(allScores);
    const topSites = allScores.sort((a, b) => b.performance - a.performance).slice(0, 10);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valmitta - Web Performance Analytics Dashboard</title>
    <meta name="description" content="Comprehensive web performance analytics tracking ${allScores.length} websites across ${this.domainsData.length} countries using Google Lighthouse metrics">
    <meta name="keywords" content="web performance, lighthouse, accessibility, SEO, performance analytics, website optimization">
    <meta name="theme-color" content="#f7931e">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://valmitta.com/#organization",
          "name": "Valmitta",
          "url": "https://valmitta.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://valmitta.com/logo.png",
            "width": 400,
            "height": 120
          },
          "description": "Global website performance analysis with Lighthouse metrics across ${allScores.length} websites from ${this.domainsData.length} countries",
          "foundingDate": "2025",
          "sameAs": [
            "https://github.com/freducom/lighthouse-global-tester"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://valmitta.com/#website", 
          "url": "https://valmitta.com",
          "name": "Valmitta",
          "description": "Comprehensive web performance analytics dashboard",
          "publisher": {
            "@id": "https://valmitta.com/#organization"
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://valmitta.com/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://valmitta.com/#software",
          "name": "Valmitta",
          "applicationCategory": "WebApplication",
          "operatingSystem": "Any",
          "description": "Comprehensive web performance analytics tracking ${allScores.length} websites across ${this.domainsData.length} countries using Google Lighthouse metrics",
          "url": "https://valmitta.com",
          "author": {
            "@id": "https://valmitta.com/#organization"
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        },
        {
          "@type": "Dataset",
          "@id": "https://valmitta.com/#dataset",
          "name": "Global Website Performance Dataset", 
          "description": "Lighthouse performance metrics for ${allScores.length} websites across ${this.domainsData.length} countries",
          "creator": {
            "@id": "https://valmitta.com/#organization"
          },
          "dateModified": "${new Date().toISOString()}",
          "keywords": ["web performance", "lighthouse", "accessibility", "SEO", "performance analytics"]
        }
      ]
    }
    </script>
</head>
<body>
    <!-- Offline Badge -->
    <div id="offline-badge" class="offline-badge" style="display: none;">
        🔌 Website Offline
    </div>
    
    <!-- Live Region for Dynamic Announcements -->
    <div id="live-region" class="live-region" aria-live="polite" aria-atomic="true"></div>
    
    <div class="container">
        <header class="header" role="banner">
            <div class="logo-container">
                <img src="logo.png" alt="Valmitta" class="header-logo">
            </div>
            <p class="subtitle">Performance insights from ${allScores.length} websites across ${this.domainsData.length} countries</p>
            
            <!-- Main Navigation -->
            <nav aria-label="Main navigation" role="navigation">
                <ul class="nav-links">
                    <li><a href="latest-updated.html">📅 Latest Scan</a></li>
                    <li><a href="all-countries.html">All Countries</a></li>
                    <li><a href="all-industries.html">All Industries</a></li>
                    <li><a href="all-companies.html">All Companies</a></li>
                </ul>
            </nav>
            
            <div class="last-updated" id="lastUpdated">
                Last updated: <time id="updateTime" datetime="${new Date().toISOString()}">Loading...</time>
            </div>
        </header>

        <main id="main-content" role="main">
            <!-- Global Statistics Section -->
            <section class="stats-grid" aria-labelledby="global-stats-heading" id="global-stats">
                <h2 id="global-stats-heading" class="sr-only">Global Performance Statistics</h2>
                
                <div class="stat-card performance" role="img" aria-labelledby="global-perf-title" aria-describedby="global-perf-desc">
                    <h3 id="global-perf-title">Global Performance</h3>
                    <div class="stat-number" aria-label="${stats.avgPerformance} percent performance score">${stats.avgPerformance}%</div>
                    <div id="global-perf-desc" class="stat-trend">📊 Average across all ${allScores.length} tested sites</div>
                </div>
                
                <div class="stat-card accessibility" role="img" aria-labelledby="global-acc-title" aria-describedby="global-acc-desc">
                    <h3 id="global-acc-title">Accessibility</h3>
                    <div class="stat-number" aria-label="${stats.avgAccessibility} percent accessibility score">${stats.avgAccessibility}%</div>
                    <div id="global-acc-desc" class="stat-trend">♿ Global accessibility compliance</div>
                </div>
                
                <div class="stat-card seo" role="img" aria-labelledby="global-seo-title" aria-describedby="global-seo-desc">
                    <h3 id="global-seo-title">SEO Score</h3>
                    <div class="stat-number" aria-label="${stats.avgSeo} percent SEO score">${stats.avgSeo}%</div>
                    <div id="global-seo-desc" class="stat-trend">🔍 Search engine optimization</div>
                </div>
                
                <div class="stat-card best-practices" role="img" aria-labelledby="global-bp-title" aria-describedby="global-bp-desc">
                    <h3 id="global-bp-title">Best Practices</h3>
                    <div class="stat-number" aria-label="${stats.avgBestPractices} percent best practices score">${stats.avgBestPractices}%</div>
                    <div id="global-bp-desc" class="stat-trend">✨ Code quality standards</div>
                </div>
            </section>

            <div class="content-grid">
                <!-- Country Comparison Section -->
                <section class="section" aria-labelledby="country-comparison-heading" id="country-comparison">
                    <h2 id="country-comparison-heading">🏆 Best & Worst Performing Countries</h2>
                    <div class="country-comparison" role="group" aria-labelledby="country-comparison-heading">
                        <a href="${this.getCountryUrl(countryStats.best.name)}" class="best-country country-tile-link" role="button" aria-labelledby="best-country-title" aria-describedby="best-country-desc">
                            <h3 id="best-country-title">🥇 Best: ${countryStats.best.name} ${this.getCountryFlag(countryStats.best.name)}</h3>
                            <div class="country-score" aria-label="${countryStats.best.avgPerformance} percent average performance">${countryStats.best.avgPerformance}%</div>
                            <p id="best-country-desc">Performance Leader</p>
                        </a>
                        <a href="${countryStats.secondBest ? this.getCountryUrl(countryStats.secondBest.name) : '#'}" class="second-best-country country-tile-link" role="button" aria-labelledby="second-best-title" aria-describedby="second-best-desc">
                            <h3 id="second-best-title">🥈 Runner-up: ${countryStats.secondBest ? countryStats.secondBest.name : 'N/A'} ${countryStats.secondBest ? this.getCountryFlag(countryStats.secondBest.name) : ''}</h3>
                            <div class="country-score" aria-label="${countryStats.secondBest ? countryStats.secondBest.avgPerformance : 0} percent average performance">${countryStats.secondBest ? countryStats.secondBest.avgPerformance : 0}%</div>
                            <p id="second-best-desc">Strong Performer</p>
                        </a>
                        <a href="${countryStats.secondWorst ? this.getCountryUrl(countryStats.secondWorst.name) : '#'}" class="second-worst-country country-tile-link" role="button" aria-labelledby="second-worst-title" aria-describedby="second-worst-desc">
                            <h3 id="second-worst-title">📈 Room for Growth: ${countryStats.secondWorst ? countryStats.secondWorst.name : 'N/A'} ${countryStats.secondWorst ? this.getCountryFlag(countryStats.secondWorst.name) : ''}</h3>
                            <div class="country-score" aria-label="${countryStats.secondWorst ? countryStats.secondWorst.avgPerformance : 0} percent average performance">${countryStats.secondWorst ? countryStats.secondWorst.avgPerformance : 0}%</div>
                            <p id="second-worst-desc">Improvement Potential</p>
                        </a>
                        <a href="${this.getCountryUrl(countryStats.worst.name)}" class="worst-country country-tile-link" role="button" aria-labelledby="worst-country-title" aria-describedby="worst-country-desc">
                            <h3 id="worst-country-title">🔄 Needs Improvement: ${countryStats.worst.name} ${this.getCountryFlag(countryStats.worst.name)}</h3>
                            <div class="country-score" aria-label="${countryStats.worst.avgPerformance} percent average performance">${countryStats.worst.avgPerformance}%</div>
                            <p id="worst-country-desc">Growth Opportunity</p>
                        </a>
                    </div>
                </section>

                <!-- Industry Rankings Section -->
                <section class="section" aria-labelledby="industry-rankings-heading" id="industry-rankings">
                    <h2 id="industry-rankings-heading">🏭 Top 5 Industries by Performance</h2>
                    
                    <div class="industry-comparison" role="group" aria-labelledby="industry-comparison-heading">
                        <h3 id="industry-comparison-heading" class="sr-only">Industry Performance Comparison</h3>
                        <div class="best-industry" role="img" aria-labelledby="best-industry-title" aria-describedby="best-industry-desc">
                            <h4 id="best-industry-title">🥇 Best: ${industryStats.best.name}</h4>
                            <div class="industry-score" aria-label="${industryStats.best.avgPerformance} percent average performance">${industryStats.best.avgPerformance}%</div>
                            <p id="best-industry-desc">Performance Leader</p>
                        </div>
                        <div class="worst-industry" role="img" aria-labelledby="worst-industry-title" aria-describedby="worst-industry-desc">
                            <h4 id="worst-industry-title">🔄 Needs Improvement: ${industryStats.worst.name}</h4>
                            <div class="industry-score" aria-label="${industryStats.worst.avgPerformance} percent average performance">${industryStats.worst.avgPerformance}%</div>
                            <p id="worst-industry-desc">Growth Opportunity</p>
                        </div>
                    </div>
                    
                    <div class="industry-rankings" aria-labelledby="top-industries-heading">
                        <h3 id="top-industries-heading">🏆 Top 5 Industries</h3>
                        <div class="industry-list" role="list">
                            ${industryStats.top5.map((industry, index) => `
                                <a href="industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}.html" 
                                   class="industry-item" 
                                   role="listitem"
                                   aria-describedby="industry-${index}-desc">
                                    <div class="industry-rank" aria-label="Rank ${index + 1}">#${index + 1}</div>
                                    <div class="industry-name">${industry.name}</div>
                                    <div id="industry-${index}-desc" class="industry-metrics" aria-label="Performance ${industry.avgPerformance}%, Accessibility ${industry.avgAccessibility}%, SEO ${industry.avgSeo}%, ${industry.count} websites">
                                        <span class="metric" aria-label="Performance ${industry.avgPerformance} percent">P: ${industry.avgPerformance}%</span>
                                        <span class="metric" aria-label="Accessibility ${industry.avgAccessibility} percent">A: ${industry.avgAccessibility}%</span>
                                        <span class="metric" aria-label="SEO ${industry.avgSeo} percent">SEO: ${industry.avgSeo}%</span>
                                        <span class="metric" aria-label="${industry.count} websites">${industry.count} sites</span>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                        <div class="see-all-link">
                            <a href="all-industries.html" class="btn-see-all" aria-describedby="see-all-industries-desc">
                                📊 See all industries
                            </a>
                            <div id="see-all-industries-desc" class="sr-only">View comprehensive list of all industry performance rankings</div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Global Websites Section -->
            <section class="section" aria-labelledby="global-websites-heading" id="global-websites">
            <h2>🌍 Top 5 Country Rankings</h2>
                <div class="country-grid">
                ${countryStats.all.slice(0, 5).map((country, index) => `
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
            <div class="see-all-link">
                <a href="all-countries.html" class="btn-see-all">🌍 See all countries</a>
            </div>
            </section>

                <h2 id="global-websites-heading">🏅 Global Top 10 Websites</h2>
                
                <div class="search-container">
                    <label for="searchInput" class="sr-only">Search websites by domain, country, or industry</label>
                    <input type="search" 
                           id="searchInput" 
                           placeholder="🔍 Search among all ${allScores.length} websites..." 
                           aria-describedby="search-instructions"
                           role="searchbox"
                           aria-label="Search websites" />
                    <div id="search-instructions" class="sr-only">
                        Type to filter the results table by website domain, country, or industry. Results will update automatically as you type.
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="results-table" id="resultsTable" role="table" aria-labelledby="global-websites-heading">
                        <caption class="sr-only">
                            Global website performance rankings showing the top performing websites with their 
                            performance scores, accessibility ratings, SEO scores, best practices compliance, 
                            Progressive Web App features, and last scan dates. Use the search box above to filter results.
                        </caption>
                        <thead>
                            <tr role="row">
                                <th scope="col" id="rank-header">Rank</th>
                                <th scope="col" id="website-header">Website</th>
                                <th scope="col" id="country-header">Country</th>
                                <th scope="col" id="industry-header">Industry</th>
                                <th scope="col" id="performance-header">Performance</th>
                                <th scope="col" id="accessibility-header">Accessibility</th>
                                <th scope="col" id="seo-header">SEO</th>
                                <th scope="col" id="best-practices-header">Best Practices</th>
                                <th scope="col" id="pwa-header">PWA</th>
                                <th scope="col" id="scanned-header">Last Scanned</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            ${topSites.map((site, index) => `
                                <tr class="site-row" 
                                    data-url="${site.url}" 
                                    data-country="${this.normalizeCountry(site.country)}"
                                    role="row">
                                    <td headers="rank-header">
                                        <span class="rank" aria-label="Rank ${index + 1}">#${index + 1}</span>
                                    </td>
                                    <td headers="website-header">
                                        <a href="domain-${site.url.replace(/\./g, '-')}.html" 
                                           class="domain-link"
                                           aria-describedby="website-desc-${index}">
                                            ${site.url}
                                        </a>
                                        <div id="website-desc-${index}" class="sr-only">
                                            View detailed performance history and analysis for ${site.url}
                                        </div>
                                    </td>
                                    <td headers="country-header">
                                        <a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html" 
                                           class="country-link"
                                           aria-label="${this.normalizeCountry(site.country)} country performance page">
                                            ${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}
                                        </a>
                                    </td>
                                    <td headers="industry-header">
                                        <a href="industry-${(site.industry || 'unknown').toLowerCase().replace(/\s+/g, '-')}.html" 
                                           class="industry-link"
                                           aria-label="${site.industry || 'Unknown'} industry performance page">
                                            ${site.industry || 'Unknown'}
                                        </a>
                                    </td>
                                    <td headers="performance-header">
                                        <span class="score perf-${this.getScoreClass(site.performance)}" 
                                              aria-label="Performance score ${site.performance} percent ${site.performance_trend ? (site.performance_trend > 0 ? 'trending up' : site.performance_trend < 0 ? 'trending down' : 'stable') : ''}">
                                            ${site.performance}% ${this.getTrendArrow(site.performance_trend)}
                                        </span>
                                    </td>
                                    <td headers="accessibility-header">
                                        <span class="score acc-${this.getScoreClass(site.accessibility)}" 
                                              aria-label="Accessibility score ${site.accessibility} percent">
                                            ${site.accessibility}%
                                        </span>
                                    </td>
                                    <td headers="seo-header">
                                        <span class="score seo-${this.getScoreClass(site.seo)}" 
                                              aria-label="SEO score ${site.seo} percent">
                                            ${site.seo}%
                                        </span>
                                    </td>
                                    <td headers="best-practices-header">
                                        <span class="score bp-${this.getScoreClass(site.best_practices)}" 
                                              aria-label="Best practices score ${site.best_practices} percent">
                                            ${site.best_practices}%
                                        </span>
                                    </td>
                                    <td headers="pwa-header">
                                        <span class="score pwa-${this.getScoreClass(site.pwa)}" 
                                              aria-label="Progressive Web App score ${site.pwa} percent">
                                            ${site.pwa}%
                                        </span>
                                    </td>
                                    <td headers="scanned-header">
                                        <time class="date" 
                                              datetime="${new Date(site.test_date).toISOString()}"
                                              data-date="${site.test_date}"
                                              aria-label="Last scanned on ${new Date(site.test_date).toLocaleDateString()}">
                                            ${new Date(site.test_date).toLocaleDateString()}
                                        </time>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            <div class="see-all-link">
                <a href="all-companies.html" class="btn-see-all">🏢 See all companies</a>
            </div>
        </section>

        <footer class="footer" role="contentinfo">
            <div class="footer-content">
                <p>📊 Generated by Valmitta | Data from <span class="sr-only">total of </span>${allScores.length} websites across ${this.domainsData.length} countries</p>
                <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener" aria-label="Visit flipsite.io to build high-performing websites">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
                <div class="footer-meta">
                    <p><small>Last updated: <time datetime="${generationTime}" id="updateTime">${new Date(generationTime).toLocaleDateString()}</time></small></p>
                    <p><small>Accessibility: WCAG 2.1 AA compliant</small></p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        // Update the last updated time to show in user's local timezone
        const generationTime = new Date('${generationTime}'); // Actual generation time from server
        document.addEventListener('DOMContentLoaded', function() {
            const updateTimeElement = document.getElementById('updateTime');
            if (updateTimeElement) {
                const options = {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                };
                updateTimeElement.textContent = generationTime.toLocaleString(undefined, options);
            }
            
            // Format all dates according to user's browser locale
            const dateCells = document.querySelectorAll('td.date[data-date]');
            dateCells.forEach(cell => {
                const dateString = cell.getAttribute('data-date');
                if (dateString) {
                    const date = new Date(dateString);
                    cell.textContent = date.toLocaleDateString();
                }
            });
        });
        
        // Format all dates according to user's browser locale
        document.addEventListener('DOMContentLoaded', function() {
            formatAllDates();
        });
        
        function formatAllDates() {
            const dateCells = document.querySelectorAll('td.date[data-date]');
            dateCells.forEach(cell => {
                const dateString = cell.getAttribute('data-date');
                if (dateString) {
                    const date = new Date(dateString);
                    cell.textContent = date.toLocaleDateString();
                }
            });
        }
        
        // All sites data for search
        const allSites = ${JSON.stringify(allScores)};
        
        // Search functionality with accessibility features
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        const liveRegion = document.getElementById('search-results-announced');
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            // Clear previous timeout to debounce search
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const filtered = allSites.filter(site => 
                    site.url.toLowerCase().includes(query) || 
                    site.country.toLowerCase().includes(query) ||
                    (site.industry && site.industry.toLowerCase().includes(query))
                );
                
                updateTable(filtered);
                
                // Announce results to screen readers
                const resultCount = Math.min(filtered.length, 50);
                const totalResults = filtered.length;
                let announcement = '';
                
                if (query.trim() === '') {
                    announcement = \`Showing top 50 websites from \${allSites.length} total\`;
                } else if (totalResults === 0) {
                    announcement = \`No results found for "\${query}"\`;
                } else if (totalResults > 50) {
                    announcement = \`Showing top 50 results from \${totalResults} matches for "\${query}"\`;
                } else {
                    announcement = \`Found \${totalResults} result\${totalResults === 1 ? '' : 's'} for "\${query}"\`;
                }
                
                if (liveRegion) {
                    liveRegion.textContent = announcement;
                }
            }, 300); // 300ms debounce
        });
        
        function updateTable(sites) {
            tableBody.innerHTML = sites.slice(0, 50).map((site, index) => \`
                <tr class="site-row" data-url="\${site.url}" data-country="\${normalizeCountry(site.country)}">
                    <td class="rank" aria-label="Rank \${index + 1}">#\${index + 1}</td>
                    <td>
                        <a href="domain-\${site.url.replace(/\\./g, '-')}.html" 
                           class="domain-link" 
                           aria-label="View detailed report for \${site.url}">
                            \${site.url}
                        </a>
                    </td>
                    <td>
                        <a href="country-\${normalizeCountry(site.country).toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="country-link"
                           aria-label="View all websites from \${normalizeCountry(site.country)}">
                            \${getCountryFlag(normalizeCountry(site.country))} \${normalizeCountry(site.country)}
                        </a>
                    </td>
                    <td>
                        <a href="industry-\${(site.industry || 'unknown').toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="industry-link"
                           aria-label="View all \${site.industry || 'Unknown'} industry websites">
                            \${site.industry || 'Unknown'}
                        </a>
                    </td>
                    <td class="score perf-\${getScoreClass(site.performance)}" 
                        aria-label="Performance score: \${site.performance} percent, \${getScoreDescription(site.performance)}">
                        \${site.performance}%
                    </td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}"
                        aria-label="Accessibility score: \${site.accessibility} percent, \${getScoreDescription(site.accessibility)}">
                        \${site.accessibility}%
                    </td>
                    <td class="score seo-\${getScoreClass(site.seo)}"
                        aria-label="SEO score: \${site.seo} percent, \${getScoreDescription(site.seo)}">
                        \${site.seo}%
                    </td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}"
                        aria-label="Best Practices score: \${site.best_practices} percent, \${getScoreDescription(site.best_practices)}">
                        \${site.best_practices}%
                    </td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}"
                        aria-label="PWA score: \${site.pwa} percent, \${getScoreDescription(site.pwa)}">
                        \${site.pwa}%
                    </td>
                    <td class="date" data-date="\${site.test_date}" 
                        aria-label="Last tested on \${new Date(site.test_date).toLocaleDateString()}">
                        <time datetime="\${site.test_date}">\${new Date(site.test_date).toLocaleDateString()}</time>
                    </td>
                </tr>
            \`).join('');
            
            // Re-format dates after table update
            formatAllDates();
        }
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
        
        function getScoreDescription(score) {
            if (score >= 90) return 'excellent performance';
            if (score >= 70) return 'good performance';
            if (score >= 50) return 'average performance';
            return 'needs improvement';
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
                'Israel': '🇮🇱',
                'Netherlands': '🇳🇱',
                'Sweden': '🇸🇪',
                'Ireland': '🇮🇪',
                'Austria': '🇦🇹',
                'Poland': '🇵🇱',
                'Norway': '🇳🇴',
                'Denmark': '🇩🇰',
                'Ukraine': '🇺🇦',
                'Hungary': '🇭🇺',
                'Estonia': '🇪🇪',
                'Lithuania': '🇱🇹',
                'Latvia': '🇱🇻',
                'Turkey': '🇹🇷',
                'Italy': '🇮🇹',
                'New Zealand': '🇳🇿',
                'South Africa': '🇿🇦',
                'Egypt': '🇪🇬',
                'Libya': '🇱🇾',
                'Iran': '🇮🇷',
                'Greece': '🇬🇷',
                'Spain': '🇪🇸',
                'France': '🇫🇷',
                'Belgium': '🇧🇪',
                'Luxembourg': '🇱🇺',
                'Switzerland': '🇨🇭',
                'Czechia': '🇨🇿',
                'Slovakia': '🇸🇰',
                'Malta': '🇲🇹',
                'China': '🇨🇳',
                'Vietnam': '🇻🇳',
                'Thailand': '🇹🇭',
                'Malaysia': '🇲🇾',
                'Singapore': '🇸🇬',
                'Indonesia': '🇮🇩',
                'Taiwan': '🇹🇼',
                'Peru': '🇵🇪',
                'Colombia': '🇨🇴',
                'Costa Rica': '🇨🇷',
                'Cuba': '🇨🇺',
                'Bolivia': '🇧🇴',
                'Chile': '🇨🇱',
                'Paraguay': '🇵🇾',
                'Uruguay': '🇺🇾',
                'Zambia': '🇿🇲',
                'Kenya': '🇰🇪',
                'Angola': '🇦🇴',
                'Namibia': '🇳🇦',
                'Global': '🌍'
            };
            return flags[country] || '🌍';
        }
    </script>

    <script>
        // Service Worker Registration for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('✅ SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                        console.log('❌ SW registration failed: ', registrationError);
                    });
            });
        }

        // Offline Detection and Badge Management
        function updateOfflineStatus() {
            const offlineBadge = document.getElementById('offline-badge');
            if (!navigator.onLine) {
                offlineBadge.style.display = 'block';
                console.log('📵 Website is now offline');
            } else {
                offlineBadge.style.display = 'none';
                console.log('🌐 Website is now online');
            }
        }

        // Check offline status on page load
        window.addEventListener('load', updateOfflineStatus);

        // Listen for online/offline events
        window.addEventListener('online', updateOfflineStatus);
        window.addEventListener('offline', updateOfflineStatus);

        // Initial check
        updateOfflineStatus();
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'index.html'), html);
  }

  async generateCountryPages() {
    for (const countryData of this.domainsData) {
      const countryScoresWithTrends = await this.db.getScoresWithTrendsForCountry(countryData.country);
      
      if (countryScoresWithTrends.length === 0) continue;

      // Convert to the expected format with trend information
      const countryScores = countryScoresWithTrends.map(row => ({
        url: row.url,
        country: row.country,
        industry: row.industry,
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
        pwa_trend: this.getTrend(row.current_pwa, row.previous_pwa),
        // Performance deltas
        performance_delta: this.getPerformanceDelta(row.current_performance, row.previous_performance),
        accessibility_delta: this.getPerformanceDelta(row.current_accessibility, row.previous_accessibility),
        best_practices_delta: this.getPerformanceDelta(row.current_best_practices, row.previous_best_practices),
        seo_delta: this.getPerformanceDelta(row.current_seo, row.previous_seo),
        pwa_delta: this.getPerformanceDelta(row.current_pwa, row.previous_pwa)
      })).sort((a, b) => b.performance - a.performance);

      const fileName = `country-${countryData.country.toLowerCase().replace(/\s+/g, '-')}.html`;
      const stats = this.calculateCountrySpecificStats(countryScores);
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${countryData.country} - Valmitta</title>
    <meta name="description" content="Lighthouse performance analysis for ${countryData.country} websites">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
    
    <!-- Schema.org Structured Data for Country Page -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Report",
          "@id": "https://valmitta.com/country-${this.normalizeCountry(countryData.country).toLowerCase().replace(/\\s+/g, '-')}.html#report",
          "name": "${countryData.country} Website Performance Report",
          "description": "Lighthouse performance analysis of ${countryScores.length} websites from ${countryData.country}",
          "author": {
            "@type": "Organization",
            "name": "Valmitta",
            "url": "https://valmitta.com"
          },
          "dateCreated": "${new Date().toISOString()}",
          "about": {
            "@type": "Place",
            "name": "${countryData.country}",
            "identifier": "${countryData.country}"
          }
        },
        {
          "@type": "Dataset",
          "@id": "https://valmitta.com/country-${this.normalizeCountry(countryData.country).toLowerCase().replace(/\\s+/g, '-')}.html#dataset",
          "name": "${countryData.country} Website Performance Data",
          "description": "Performance metrics for ${countryScores.length} websites from ${countryData.country}",
          "creator": {
            "@type": "Organization",
            "name": "Valmitta",
            "url": "https://valmitta.com"
          },
          "spatialCoverage": {
            "@type": "Place",
            "name": "${countryData.country}"
          },
          "dateModified": "${new Date().toISOString()}",
          "keywords": ["${countryData.country}", "web performance", "lighthouse", "website analysis"]
        }
      ]
    }
    </script>
</head>
<body>
    <!-- Offline Badge -->
    <div id="offline-badge" class="offline-badge" style="display: none;">
        🔌 Website Offline
    </div>
    
    <div class="container">
        <header class="header" role="banner">
            <nav class="breadcrumb" aria-label="Breadcrumb navigation">
                <ol class="breadcrumb-list">
                    <li><a href="index.html" aria-label="Return to homepage">🏠 Home</a></li>
                    <li aria-current="page">${this.getCountryFlag(countryData.country)} ${countryData.country}</li>
                </ol>
            </nav>
            <h1>${this.getCountryFlag(countryData.country)} ${countryData.country} Performance Analysis</h1>
            <p class="subtitle">Comprehensive lighthouse analysis of ${countryScores.length} websites from ${countryData.country}</p>
        </header>

        <section class="stats-grid" aria-labelledby="stats-heading">
            <h2 id="stats-heading" class="sr-only">Performance Statistics for ${countryData.country}</h2>
            <div class="stat-card performance" role="img" aria-label="Average performance score: ${stats.avgPerformance} percent">
                <h3>Average Performance</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgPerformance}%</div>
                <p class="sr-only">Performance measures loading speed and user experience</p>
            </div>
            <div class="stat-card accessibility" role="img" aria-label="Average accessibility score: ${stats.avgAccessibility} percent">
                <h3>Average Accessibility</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgAccessibility}%</div>
                <p class="sr-only">Accessibility measures compliance with web standards for users with disabilities</p>
            </div>
            <div class="stat-card seo" role="img" aria-label="Average SEO score: ${stats.avgSeo} percent">
                <h3>Average SEO</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgSeo}%</div>
                <p class="sr-only">SEO measures search engine optimization and discoverability</p>
            </div>
            <div class="stat-card best-practices" role="img" aria-label="Average best practices score: ${stats.avgBestPractices} percent">
                <h3>Best Practices</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgBestPractices}%</div>
                <p class="sr-only">Best practices measures security and modern web standards compliance</p>
            </div>
        </section>

        <main id="main-content" role="main">
            <section class="section" aria-labelledby="websites-heading">
                <h2 id="websites-heading">🏅 Top Websites in ${countryData.country}</h2>
                
                <div class="sorting-controls">
                    <h4>Quick Sort Options:</h4>
                    <div class="sort-buttons">
                        <button class="sort-btn active" data-sort="performance" data-order="desc">Performance ↓</button>
                        <button class="sort-btn" data-sort="accessibility" data-order="desc">Accessibility ↓</button>
                        <button class="sort-btn" data-sort="seo" data-order="desc">SEO ↓</button>
                        <button class="sort-btn" data-sort="best_practices" data-order="desc">Best Practices ↓</button>
                        <button class="sort-btn" data-sort="pwa" data-order="desc">PWA ↓</button>
                        <button class="sort-btn" data-sort="url" data-order="asc">Name A-Z</button>
                        <button class="sort-btn" data-sort="test_date" data-order="desc">Latest First</button>
                    </div>
                </div>

                <div class="search-container">
                    <label for="searchInput" class="sr-only">Search ${countryData.country} websites by name or industry</label>
                    <input type="text" 
                           id="searchInput" 
                           placeholder="🔍 Search ${countryData.country} websites..." 
                           aria-describedby="search-help"
                           autocomplete="off" />
                    <div id="search-help" class="sr-only">Type to filter websites by name or industry. Results update automatically as you type.</div>
                    <div id="search-results-announced" class="sr-only" aria-live="polite" aria-atomic="true"></div>
                </div>
                <div class="table-container">
                    <table class="results-table" id="resultsTable" role="table" aria-labelledby="websites-heading">
                        <caption class="sr-only">
                            Lighthouse performance data for ${countryScores.length} websites from ${countryData.country}, 
                            sorted by performance score in descending order. 
                            Table includes website URL, industry, and scores for performance, accessibility, SEO, best practices, and PWA compliance with trend indicators.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col" class="sortable-header" data-sort="rank" aria-sort="none">
                                    Rank <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="url" aria-sort="none">
                                    Website <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="industry" aria-sort="none">
                                    Industry <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header sort-desc" data-sort="performance" aria-sort="descending">
                                    Performance <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="accessibility" aria-sort="none">
                                    Accessibility <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="seo" aria-sort="none">
                                    SEO <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="best_practices" aria-sort="none">
                                    Best Practices <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="pwa" aria-sort="none">
                                    PWA <span class="sort-indicator"></span>
                                </th>
                                <th scope="col" class="sortable-header" data-sort="test_date" aria-sort="none">
                                    Last Scanned <span class="sort-indicator"></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                        ${countryScores.map((site, index) => {
                            const perfDelta = site.performance_delta;
                            const accDelta = site.accessibility_delta;
                            const seoDelta = site.seo_delta;
                            const bpDelta = site.best_practices_delta;
                            const pwaDelta = site.pwa_delta;
                            
                            return `
                            <tr class="site-row ${site.performance_trend === 'up' ? 'trending-up' : site.performance_trend === 'down' ? 'trending-down' : ''}" 
                                data-url="${site.url}" 
                                data-industry="${site.industry || 'unknown'}"
                                data-performance="${site.performance}"
                                data-accessibility="${site.accessibility}"
                                data-seo="${site.seo}"
                                data-best-practices="${site.best_practices}"
                                data-pwa="${site.pwa}"
                                data-test-date="${site.test_date}">
                                <td class="rank" aria-label="Rank ${index + 1}">#${index + 1}</td>
                                <td>
                                    <a href="domain-${site.url.replace(/\./g, '-')}.html" 
                                       class="domain-link"
                                       aria-label="View detailed report for ${site.url}">
                                        ${site.url}
                                    </a>
                                </td>
                                <td>
                                    <a href="industry-${(site.industry || 'unknown').toLowerCase().replace(/\s+/g, '-')}.html" 
                                       class="industry-link"
                                       aria-label="View all ${site.industry || 'Unknown'} industry websites">
                                        ${site.industry || 'Unknown'}
                                    </a>
                                </td>
                                <td class="score perf-${this.getScoreClass(site.performance)}"
                                    aria-label="Performance score: ${site.performance} percent, ${this.getScoreDescription(site.performance)}${perfDelta.delta !== 0 ? `, trend: ${perfDelta.text} points` : ''}">
                                    ${site.performance}%${this.getTrendArrow(site.performance_trend)}${perfDelta.delta !== 0 ? `<span class="performance-delta ${perfDelta.class}">${perfDelta.text}</span>` : ''}
                                </td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}"
                                    aria-label="Accessibility score: ${site.accessibility} percent, ${this.getScoreDescription(site.accessibility)}${accDelta.delta !== 0 ? `, trend: ${accDelta.text} points` : ''}">
                                    ${site.accessibility}%${this.getTrendArrow(site.accessibility_trend)}${accDelta.delta !== 0 ? `<span class="performance-delta ${accDelta.class}">${accDelta.text}</span>` : ''}
                                </td>
                                <td class="score seo-${this.getScoreClass(site.seo)}"
                                    aria-label="SEO score: ${site.seo} percent, ${this.getScoreDescription(site.seo)}${seoDelta.delta !== 0 ? `, trend: ${seoDelta.text} points` : ''}">
                                    ${site.seo}%${this.getTrendArrow(site.seo_trend)}${seoDelta.delta !== 0 ? `<span class="performance-delta ${seoDelta.class}">${seoDelta.text}</span>` : ''}
                                </td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}"
                                    aria-label="Best Practices score: ${site.best_practices} percent, ${this.getScoreDescription(site.best_practices)}${bpDelta.delta !== 0 ? `, trend: ${bpDelta.text} points` : ''}">
                                    ${site.best_practices}%${this.getTrendArrow(site.best_practices_trend)}${bpDelta.delta !== 0 ? `<span class="performance-delta ${bpDelta.class}">${bpDelta.text}</span>` : ''}
                                </td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}"
                                    aria-label="PWA score: ${site.pwa} percent, ${this.getScoreDescription(site.pwa)}${pwaDelta.delta !== 0 ? `, trend: ${pwaDelta.text} points` : ''}">
                                    ${site.pwa}%${this.getTrendArrow(site.pwa_trend)}${pwaDelta.delta !== 0 ? `<span class="performance-delta ${pwaDelta.class}">${pwaDelta.text}</span>` : ''}
                                </td>
                                <td class="date" data-date="${site.test_date}"
                                    aria-label="Last tested on ${new Date(site.test_date).toLocaleDateString()}">
                                    <time datetime="${site.test_date}">${new Date(site.test_date).toLocaleDateString()}</time>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </section>
        </main>

        <footer class="footer" role="contentinfo">
            <div class="footer-content">
                <p>📊 ${this.normalizeCountry(countryData.country)} Performance Data | ${countryScores.length} websites tested</p>
                <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener" aria-label="Visit flipsite.io to build high-performing websites">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
                <div class="footer-meta">
                    <p><small><a href="index.html" aria-label="Back to global homepage">← Back to Global View</a></small></p>
                    <p><small>Accessibility: WCAG 2.1 AA compliant</small></p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        const countryData = ${JSON.stringify(countryScores)};
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        const liveRegion = document.getElementById('search-results-announced');
        let searchTimeout;
        let currentSort = { column: 'performance', order: 'desc' };
        let filteredData = [...countryData];
        
        // Advanced sorting functionality
        function sortData(column, order = 'asc') {
            const sorted = [...filteredData].sort((a, b) => {
                let aVal = a[column];
                let bVal = b[column];
                
                // Handle different data types
                if (column === 'test_date') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                } else if (typeof aVal === 'number') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                }
                
                if (order === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
            
            currentSort = { column, order };
            updateCountryTable(sorted);
            updateSortIndicators();
        }
        
        // Update sort indicators in table headers
        function updateSortIndicators() {
            document.querySelectorAll('.sortable-header').forEach(header => {
                const column = header.getAttribute('data-sort');
                header.classList.remove('sort-asc', 'sort-desc');
                
                if (column === currentSort.column) {
                    header.classList.add(\`sort-\${currentSort.order}\`);
                    header.setAttribute('aria-sort', currentSort.order === 'asc' ? 'ascending' : 'descending');
                } else {
                    header.setAttribute('aria-sort', 'none');
                }
            });
        }
        
        // Enhanced search functionality with accessibility features
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            // Clear previous timeout to debounce search
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                filteredData = countryData.filter(site => 
                    site.url.toLowerCase().includes(query) ||
                    (site.industry && site.industry.toLowerCase().includes(query))
                );
                
                // Re-apply current sort to filtered data
                sortData(currentSort.column, currentSort.order);
                
                // Announce results to screen readers
                let announcement = '';
                if (query.trim() === '') {
                    announcement = \`Showing all \${countryData.length} websites from ${countryData.country}\`;
                } else if (filteredData.length === 0) {
                    announcement = \`No results found for "\${query}" in ${countryData.country}\`;
                } else {
                    announcement = \`Found \${filteredData.length} result\${filteredData.length === 1 ? '' : 's'} for "\${query}" in ${countryData.country}\`;
                }
                
                if (liveRegion) {
                    liveRegion.textContent = announcement;
                }
            }, 300);
        });
        
        // Add click handlers for sortable headers
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                const newOrder = (currentSort.column === column && currentSort.order === 'asc') ? 'desc' : 'asc';
                sortData(column, newOrder);
            });
            
            // Add keyboard support
            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
            
            // Make headers focusable
            header.setAttribute('tabindex', '0');
        });
        
        // Add click handlers for sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                const order = this.getAttribute('data-order');
                
                // Update active button
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                sortData(column, order);
            });
        });
        
        function updateCountryTable(data) {
            const getScoreClass = (score) => {
                if (score >= 90) return 'excellent';
                if (score >= 70) return 'good';
                if (score >= 50) return 'average';
                return 'poor';
            };
            
            const getScoreDescription = (score) => {
                if (score >= 90) return 'Excellent';
                if (score >= 70) return 'Good';
                if (score >= 50) return 'Average';
                return 'Poor';
            };
            
            const getTrendArrow = (trend) => {
                switch(trend) {
                    case 'up': return '<span class="trend-arrow trend-up">↗</span>';
                    case 'down': return '<span class="trend-arrow trend-down">↘</span>';
                    default: return '';
                }
            };
            
            const getPerformanceDelta = (current, previous) => {
                if (previous === null || previous === undefined) {
                    return { delta: 0, text: '', class: 'delta-neutral' };
                }
                const delta = current - previous;
                if (delta > 0) {
                    return { delta, text: \`+\${delta}\`, class: 'delta-positive' };
                } else if (delta < 0) {
                    return { delta, text: \`\${delta}\`, class: 'delta-negative' };
                } else {
                    return { delta: 0, text: '±0', class: 'delta-neutral' };
                }
            };
            
            tableBody.innerHTML = data.map((site, index) => {
                const perfDelta = site.performance_delta || { delta: 0, text: '', class: 'delta-neutral' };
                const accDelta = site.accessibility_delta || { delta: 0, text: '', class: 'delta-neutral' };
                const seoDelta = site.seo_delta || { delta: 0, text: '', class: 'delta-neutral' };
                const bpDelta = site.best_practices_delta || { delta: 0, text: '', class: 'delta-neutral' };
                const pwaDelta = site.pwa_delta || { delta: 0, text: '', class: 'delta-neutral' };
                
                return \`
                <tr class="site-row \${site.performance_trend === 'up' ? 'trending-up' : site.performance_trend === 'down' ? 'trending-down' : ''}" 
                    data-url="\${site.url}" 
                    data-industry="\${site.industry || 'unknown'}"
                    data-performance="\${site.performance}"
                    data-accessibility="\${site.accessibility}"
                    data-seo="\${site.seo}"
                    data-best-practices="\${site.best_practices}"
                    data-pwa="\${site.pwa}"
                    data-test-date="\${site.test_date}">
                    <td class="rank" aria-label="Rank \${index + 1}">#\${index + 1}</td>
                    <td>
                        <a href="domain-\${site.url.replace(/\\./g, '-')}.html" 
                           class="domain-link"
                           aria-label="View detailed report for \${site.url}">
                            \${site.url}
                        </a>
                    </td>
                    <td>
                        <a href="industry-\${(site.industry || 'unknown').toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="industry-link"
                           aria-label="View all \${site.industry || 'Unknown'} industry websites">
                            \${site.industry || 'Unknown'}
                        </a>
                    </td>
                    <td class="score perf-\${getScoreClass(site.performance)}"
                        aria-label="Performance score: \${site.performance} percent, \${getScoreDescription(site.performance)}\${perfDelta.delta !== 0 ? \`, trend: \${perfDelta.text} points\` : ''}">
                        \${site.performance}%\${getTrendArrow(site.performance_trend)}\${perfDelta.delta !== 0 ? \`<span class="performance-delta \${perfDelta.class}">\${perfDelta.text}</span>\` : ''}
                    </td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}"
                        aria-label="Accessibility score: \${site.accessibility} percent, \${getScoreDescription(site.accessibility)}\${accDelta.delta !== 0 ? \`, trend: \${accDelta.text} points\` : ''}">
                        \${site.accessibility}%\${getTrendArrow(site.accessibility_trend)}\${accDelta.delta !== 0 ? \`<span class="performance-delta \${accDelta.class}">\${accDelta.text}</span>\` : ''}
                    </td>
                    <td class="score seo-\${getScoreClass(site.seo)}"
                        aria-label="SEO score: \${site.seo} percent, \${getScoreDescription(site.seo)}\${seoDelta.delta !== 0 ? \`, trend: \${seoDelta.text} points\` : ''}">
                        \${site.seo}%\${getTrendArrow(site.seo_trend)}\${seoDelta.delta !== 0 ? \`<span class="performance-delta \${seoDelta.class}">\${seoDelta.text}</span>\` : ''}
                    </td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}"
                        aria-label="Best Practices score: \${site.best_practices} percent, \${getScoreDescription(site.best_practices)}\${bpDelta.delta !== 0 ? \`, trend: \${bpDelta.text} points\` : ''}">
                        \${site.best_practices}%\${getTrendArrow(site.best_practices_trend)}\${bpDelta.delta !== 0 ? \`<span class="performance-delta \${bpDelta.class}">\${bpDelta.text}</span>\` : ''}
                    </td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}"
                        aria-label="PWA score: \${site.pwa} percent, \${getScoreDescription(site.pwa)}\${pwaDelta.delta !== 0 ? \`, trend: \${pwaDelta.text} points\` : ''}">
                        \${site.pwa}%\${getTrendArrow(site.pwa_trend)}\${pwaDelta.delta !== 0 ? \`<span class="performance-delta \${pwaDelta.class}">\${pwaDelta.text}</span>\` : ''}
                    </td>
                    <td class="date" data-date="\${site.test_date}"
                        aria-label="Last tested on \${new Date(site.test_date).toLocaleDateString()}">
                        <time datetime="\${site.test_date}">\${new Date(site.test_date).toLocaleDateString()}</time>
                    </td>
                </tr>\`;
            }).join('');
        }
        
        // Initialize with default sort
        updateSortIndicators();
        
        function updateCountryTable(sites) {
            tableBody.innerHTML = sites.map((site, index) => \`
                <tr class="site-row">
                    <td class="rank" aria-label="Rank \${index + 1}">#\${index + 1}</td>
                    <td>
                        <a href="domain-\${site.url.replace(/\\./g, '-')}.html" 
                           class="domain-link"
                           aria-label="View detailed report for \${site.url}">
                            \${site.url}
                        </a>
                    </td>
                    <td>
                        <a href="industry-\${(site.industry || 'unknown').toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="industry-link"
                           aria-label="View all \${site.industry || 'Unknown'} industry websites">
                            \${site.industry || 'Unknown'}
                        </a>
                    </td>
                    <td class="score perf-\${getScoreClass(site.performance)}"
                        aria-label="Performance score: \${site.performance} percent, \${getScoreDescription(site.performance)}">
                        \${site.performance}%
                    </td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}"
                        aria-label="Accessibility score: \${site.accessibility} percent, \${getScoreDescription(site.accessibility)}">
                        \${site.accessibility}%
                    </td>
                    <td class="score seo-\${getScoreClass(site.seo)}"
                        aria-label="SEO score: \${site.seo} percent, \${getScoreDescription(site.seo)}">
                        \${site.seo}%
                    </td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}"
                        aria-label="Best Practices score: \${site.best_practices} percent, \${getScoreDescription(site.best_practices)}">
                        \${site.best_practices}%
                    </td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}"
                        aria-label="PWA score: \${site.pwa} percent, \${getScoreDescription(site.pwa)}">
                        \${site.pwa}%
                    </td>
                    <td class="date" data-date="\${site.test_date}"
                        aria-label="Last tested on \${new Date(site.test_date).toLocaleDateString()}">
                        <time datetime="\${site.test_date}">\${new Date(site.test_date).toLocaleDateString()}</time>
                    </td>
                </tr>
            \`).join('');
        }
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
        
        function getScoreDescription(score) {
            if (score >= 90) return 'excellent performance';
            if (score >= 70) return 'good performance';
            if (score >= 50) return 'average performance';
            return 'needs improvement';
        }
        
        // Format dates in user's locale
        function formatAllDates() {
            const dateCells = document.querySelectorAll('td.date[data-date]');
            dateCells.forEach(cell => {
                const dateString = cell.getAttribute('data-date');
                if (dateString) {
                    const date = new Date(dateString);
                    cell.querySelector('time').textContent = date.toLocaleDateString();
                }
            });
        }
        
        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', function() {
            formatAllDates();
        });
        
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('SW registered', registration))
                .catch(error => console.log('SW registration failed', error));
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
    <title>Global - Valmitta</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
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

  async generateIndustryPages() {
    console.log('🏭 Generating industry pages...');
    
    // Get all unique industries from the database
    const allScores = await this.db.getAllLatestScores();
    const industries = [...new Set(allScores.map(score => score.industry).filter(industry => industry))];
    
    for (const industry of industries) {
      const industryScoresWithTrends = await this.db.getScoresWithTrendsForIndustry(industry);
      
      if (industryScoresWithTrends.length === 0) continue;

      // Convert to the expected format with trend information
      const industryScores = industryScoresWithTrends.map(row => ({
        url: row.url,
        country: row.country,
        industry: row.industry,
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
        pwa_trend: this.getTrend(row.current_pwa, row.previous_pwa),
        // Performance deltas
        performance_delta: this.getPerformanceDelta(row.current_performance, row.previous_performance),
        accessibility_delta: this.getPerformanceDelta(row.current_accessibility, row.previous_accessibility),
        best_practices_delta: this.getPerformanceDelta(row.current_best_practices, row.previous_best_practices),
        seo_delta: this.getPerformanceDelta(row.current_seo, row.previous_seo),
        pwa_delta: this.getPerformanceDelta(row.current_pwa, row.previous_pwa)
      })).sort((a, b) => b.performance - a.performance);
      const fileName = `industry-${industry.toLowerCase().replace(/\s+/g, '-')}.html`;
      const stats = this.calculateIndustrySpecificStats(industryScores);
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${industry} Industry - Valmitta</title>
    <meta name="description" content="Lighthouse performance analysis for ${industry.toLowerCase()} industry websites">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header" role="banner">
            <nav class="breadcrumb" aria-label="Breadcrumb navigation">
                <ol class="breadcrumb-list">
                    <li><a href="index.html" aria-label="Return to homepage">🏠 Home</a></li>
                    <li aria-current="page">🏭 ${industry}</li>
                </ol>
            </nav>
            <h1>🏭 ${industry} Industry Performance Analysis</h1>
            <p class="subtitle">Comprehensive lighthouse analysis of ${industryScores.length} websites in the ${industry.toLowerCase()} industry</p>
        </header>

        <section class="stats-grid" aria-labelledby="stats-heading">
            <h2 id="stats-heading" class="sr-only">Performance Statistics for ${industry} Industry</h2>
            <div class="stat-card" role="img" aria-label="Average performance score: ${stats.avgPerformance} percent">
                <h3>Average Performance</h3>
                <div class="stat-value perf-${this.getScoreClass(stats.avgPerformance)}" aria-hidden="true">${stats.avgPerformance}%</div>
                <p class="sr-only">Performance measures loading speed and user experience</p>
            </div>
            <div class="stat-card" role="img" aria-label="Average accessibility score: ${stats.avgAccessibility} percent">
                <h3>Average Accessibility</h3>
                <div class="stat-value acc-${this.getScoreClass(stats.avgAccessibility)}" aria-hidden="true">${stats.avgAccessibility}%</div>
                <p class="sr-only">Accessibility measures compliance with web standards for users with disabilities</p>
            </div>
            <div class="stat-card" role="img" aria-label="Average SEO score: ${stats.avgSeo} percent">
                <h3>Average SEO</h3>
                <div class="stat-value seo-${this.getScoreClass(stats.avgSeo)}" aria-hidden="true">${stats.avgSeo}%</div>
                <p class="sr-only">SEO measures search engine optimization and discoverability</p>
            </div>
            <div class="stat-card" role="img" aria-label="Average best practices score: ${stats.avgBestPractices} percent">
                <h3>Average Best Practices</h3>
                <div class="stat-value bp-${this.getScoreClass(stats.avgBestPractices)}" aria-hidden="true">${stats.avgBestPractices}%</div>
                <p class="sr-only">Best practices measures security and modern web standards compliance</p>
            </div>
        </section>

        <main id="main-content" role="main">
            <section class="section" aria-labelledby="websites-heading">
                <h2 id="websites-heading">📈 ${industry} Websites</h2>
                <div class="search-container">
                    <label for="searchInput" class="sr-only">Search ${industry} websites by name or country</label>
                    <input type="text" 
                           id="searchInput" 
                           placeholder="🔍 Search ${industry} websites..." 
                           aria-describedby="search-help"
                           autocomplete="off" />
                    <div id="search-help" class="sr-only">Type to filter websites by name or country. Results update automatically as you type.</div>
                    <div id="search-results-announced" class="sr-only" aria-live="polite" aria-atomic="true"></div>
                </div>
                <div class="table-container">
                    <table class="results-table" id="resultsTable" role="table" aria-labelledby="websites-heading">
                        <caption class="sr-only">
                            Lighthouse performance data for ${industryScores.length} websites in the ${industry} industry, 
                            sorted by performance score in descending order. 
                            Table includes website URL, country, and scores for performance, accessibility, SEO, best practices, and PWA compliance.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col" aria-sort="none">Rank</th>
                                <th scope="col" aria-sort="none">Website</th>
                                <th scope="col" aria-sort="none">Country</th>
                                <th scope="col" aria-sort="descending" aria-label="Performance score, currently sorted descending">Performance</th>
                                <th scope="col" aria-sort="none">Accessibility</th>
                                <th scope="col" aria-sort="none">SEO</th>
                                <th scope="col" aria-sort="none">Best Practices</th>
                                <th scope="col" aria-sort="none">PWA</th>
                                <th scope="col" aria-sort="none">Last Scanned</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                        ${industryScores.map((site, index) => `
                            <tr class="site-row">
                                <td class="rank" aria-label="Rank ${index + 1}">#${index + 1}</td>
                                <td>
                                    <a href="domain-${site.url.replace(/\./g, '-')}.html" 
                                       class="domain-link"
                                       aria-label="View detailed report for ${site.url}">
                                        ${site.url}
                                    </a>
                                </td>
                                <td>
                                    <a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html" 
                                       class="country-link"
                                       aria-label="View all websites from ${this.normalizeCountry(site.country)}">
                                        ${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}
                                    </a>
                                </td>
                                <td class="score perf-${this.getScoreClass(site.performance)}"
                                    aria-label="Performance score: ${site.performance} percent, ${this.getScoreDescription(site.performance)}">
                                    ${site.performance}%
                                </td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}"
                                    aria-label="Accessibility score: ${site.accessibility} percent, ${this.getScoreDescription(site.accessibility)}">
                                    ${site.accessibility}%
                                </td>
                                <td class="score seo-${this.getScoreClass(site.seo)}"
                                    aria-label="SEO score: ${site.seo} percent, ${this.getScoreDescription(site.seo)}">
                                    ${site.seo}%
                                </td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}"
                                    aria-label="Best Practices score: ${site.best_practices} percent, ${this.getScoreDescription(site.best_practices)}">
                                    ${site.best_practices}%
                                </td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}"
                                    aria-label="PWA score: ${site.pwa} percent, ${this.getScoreDescription(site.pwa)}">
                                    ${site.pwa}%
                                </td>
                                <td class="date" data-date="${site.test_date}"
                                    aria-label="Last tested on ${new Date(site.test_date).toLocaleDateString()}">
                                    <time datetime="${site.test_date}">${new Date(site.test_date).toLocaleDateString()}</time>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
        </main>

        <footer class="footer" role="contentinfo">
            <div class="footer-content">
                <p>📊 ${industry} Industry Performance Data | ${industryScores.length} websites tested</p>
                <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener" aria-label="Visit flipsite.io to build high-performing websites">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
                <div class="footer-meta">
                    <p><small><a href="index.html" aria-label="Back to global homepage">← Back to Global View</a></small></p>
                    <p><small>Accessibility: WCAG 2.1 AA compliant</small></p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        const industryData = ${JSON.stringify(industryScores)};
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        const liveRegion = document.getElementById('search-results-announced');
        let searchTimeout;
        
        // Enhanced search functionality with accessibility features
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            // Clear previous timeout to debounce search
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const filtered = industryData.filter(site => 
                    site.url.toLowerCase().includes(query) ||
                    site.country.toLowerCase().includes(query)
                );
                
                updateIndustryTable(filtered);
                
                // Announce results to screen readers
                let announcement = '';
                if (query.trim() === '') {
                    announcement = \`Showing all \${industryData.length} websites in ${industry}\`;
                } else if (filtered.length === 0) {
                    announcement = \`No results found for "\${query}" in ${industry}\`;
                } else {
                    announcement = \`Found \${filtered.length} result\${filtered.length === 1 ? '' : 's'} for "\${query}" in ${industry}\`;
                }
                
                if (liveRegion) {
                    liveRegion.textContent = announcement;
                }
            }, 300);
        });
        
        function updateIndustryTable(sites) {
            tableBody.innerHTML = sites.map((site, index) => \`
                <tr class="site-row">
                    <td class="rank" aria-label="Rank \${index + 1}">#\${index + 1}</td>
                    <td>
                        <a href="domain-\${site.url.replace(/\\./g, '-')}.html" 
                           class="domain-link"
                           aria-label="View detailed report for \${site.url}">
                            \${site.url}
                        </a>
                    </td>
                    <td>
                        <a href="country-\${normalizeCountry(site.country).toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="country-link"
                           aria-label="View all websites from \${normalizeCountry(site.country)}">
                            \${getCountryFlag(site.country)} \${normalizeCountry(site.country)}
                        </a>
                    </td>
                    <td class="score perf-\${getScoreClass(site.performance)}"
                        aria-label="Performance score: \${site.performance} percent, \${getScoreDescription(site.performance)}">
                        \${site.performance}%
                    </td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}"
                        aria-label="Accessibility score: \${site.accessibility} percent, \${getScoreDescription(site.accessibility)}">
                        \${site.accessibility}%
                    </td>
                    <td class="score seo-\${getScoreClass(site.seo)}"
                        aria-label="SEO score: \${site.seo} percent, \${getScoreDescription(site.seo)}">
                        \${site.seo}%
                    </td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}"
                        aria-label="Best Practices score: \${site.best_practices} percent, \${getScoreDescription(site.best_practices)}">
                        \${site.best_practices}%
                    </td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}"
                        aria-label="PWA score: \${site.pwa} percent, \${getScoreDescription(site.pwa)}">
                        \${site.pwa}%
                    </td>
                    <td class="date" data-date="\${site.test_date}"
                        aria-label="Last tested on \${new Date(site.test_date).toLocaleDateString()}">
                        <time datetime="\${site.test_date}">\${new Date(site.test_date).toLocaleDateString()}</time>
                    </td>
                </tr>
            \`).join('');
        }
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
        
        function getScoreDescription(score) {
            if (score >= 90) return 'excellent performance';
            if (score >= 70) return 'good performance';
            if (score >= 50) return 'average performance';
            return 'needs improvement';
        }

        function getCountryFlag(country) {
            const flags = {
                'Australia': '🇦🇺', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
                'Germany': '🇩🇪', 'France': '🇫🇷', 'Canada': '🇨🇦', 'Japan': '🇯🇵',
                'Brazil': '🇧🇷', 'India': '🇮🇳', 'Russia': '🇷🇺', 'Sweden': '🇸🇪',
                'Netherlands': '🇳🇱', 'Finland': '🇫🇮', 'South Korea': '🇰🇷',
                'Israel': '🇮🇱', 'Global': '🌍'
            };
            return flags[country] || '🌍';
        }
        
        function normalizeCountry(country) {
            return country === 'Unknown' ? 'Global' : country;
        }
        
        // Format dates in user's locale
        function formatAllDates() {
            const dateCells = document.querySelectorAll('td.date[data-date]');
            dateCells.forEach(cell => {
                const dateString = cell.getAttribute('data-date');
                if (dateString) {
                    const date = new Date(dateString);
                    const timeElement = cell.querySelector('time');
                    if (timeElement) {
                        timeElement.textContent = date.toLocaleDateString();
                    }
                }
            });
        }
        
        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', function() {
            formatAllDates();
        });
        
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('SW registered', registration))
                .catch(error => console.log('SW registration failed', error));
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
    <meta name="description" content="Lighthouse performance history and insights for ${site.url}">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Schema.org Structured Data for Domain Page -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Report",
          "@id": "https://valmitta.com/domain-${site.url.replace(/\\./g, '-')}.html#report",
          "name": "${site.url} Performance Report",
          "description": "Lighthouse performance history and insights for ${site.url}",
          "author": {
            "@type": "Organization",
            "name": "Valmitta",
            "url": "https://valmitta.com"
          },
          "dateCreated": "${new Date().toISOString()}",
          "about": {
            "@type": "WebSite",
            "name": "${site.url}",
            "url": "https://${site.url}"
          }
        },
        {
          "@type": "PerformanceMetrics",
          "@id": "https://valmitta.com/domain-${site.url.replace(/\\./g, '-')}.html#metrics",
          "name": "${site.url} Performance Metrics",
          "description": "Latest Lighthouse scores for ${site.url}",
          "performanceScore": ${site.performance},
          "accessibilityScore": ${site.accessibility},
          "bestPracticesScore": ${site.best_practices},
          "seoScore": ${site.seo},
          "dateRecorded": "${site.test_date}"
        }
      ]
    }
    </script>
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
            <p>📊 <a href="https://${site.url}" target="_blank" rel="noopener">${site.url}</a> Performance History | Last tested: ${new Date(site.test_date).toLocaleDateString()}</p>
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
        
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('SW registered', registration))
                .catch(error => console.log('SW registration failed', error));
        }
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
    box-sizing: border-box;
}

.header {
    background: #ffffff;
    padding: 20px;
    margin: -20px -20px 20px -20px;
    border-radius: 0 0 8px 8px;
    color: #1c1e21;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    border-bottom: 2px solid #f7931e;
}

.header h1 {
    font-size: 2.5em;
    font-weight: 700;
    margin-bottom: 10px;
}

.logo-container {
    margin-bottom: 10px;
}

.header-logo {
    height: 60px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
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

.breadcrumb-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 5px;
}

.breadcrumb-list li {
    display: flex;
    align-items: center;
}

.breadcrumb-list li::marker {
    display: none;
}

.breadcrumb a {
    color: #1e3a5f;
    text-decoration: none;
    transition: color 0.2s;
}

.breadcrumb a:hover {
    color: #f7931e;
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
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 30px;
    min-width: 0;
}

.section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    min-height: auto;
    overflow: visible;
    min-width: 0;
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

.best-country, .second-best-country, .second-worst-country, .worst-country {
    text-align: center;
    padding: 20px;
    border-radius: 8px;
}

.best-country {
    background: linear-gradient(135deg, #f7931e 0%, #1e3a5f 100%);
    color: white;
}

.second-best-country {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
}

.second-worst-country {
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    color: #333;
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

/* Clickable country tile styles */
.country-tile-link {
    display: block;
    text-decoration: none;
    color: white;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
}

.country-tile-link:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.country-tile-link:focus {
    outline: 3px solid #0066cc;
    outline-offset: 2px;
}

.country-tile-link:active {
    transform: translateY(-1px);
}

.industry-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

.best-industry, .worst-industry {
    text-align: center;
    padding: 20px;
    border-radius: 8px;
    min-width: 0;
    overflow-wrap: break-word;
}

.best-industry {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
}

.worst-industry {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    color: white;
}

.industry-score {
    font-size: 2em;
    font-weight: 700;
    margin: 10px 0;
}

.industry-rankings {
    margin-top: 20px;
    overflow: visible;
}

.industry-rankings h3 {
    margin-bottom: 15px;
    color: #1c1e21;
}

.industry-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.industry-item {
    display: flex;
    align-items: center;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-decoration: none !important;
    color: inherit;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.industry-item:hover {
    background: #e9ecef;
    border-color: #007bff;
    transform: translateY(-2px);
    text-decoration: none !important;
}

.industry-rank {
    font-size: 1.2em;
    font-weight: 700;
    width: 40px;
    text-align: center;
    color: #1c1e21;
}

.industry-name {
    flex: 1;
    font-weight: 600;
    margin-left: 15px;
}

.industry-metrics {
    display: flex;
    gap: 10px;
}

.industry-link {
    color: #007bff;
    text-decoration: none;
    font-weight: 500;
}

.industry-link:hover {
    text-decoration: underline;
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
    text-decoration: none !important;
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
    text-decoration: none !important;
}

.country-rank {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #1c1e21;
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

.see-all-link {
    text-align: center;
    margin-top: 20px;
}

.btn-see-all {
    display: inline-block;
    background: linear-gradient(135deg, #1877f2 0%, #42a5f5 100%);
    color: white !important;
    padding: 12px 24px;
    border-radius: 24px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(24, 119, 242, 0.3);
}

.btn-see-all:hover {
    background: linear-gradient(135deg, #166dd4 0%, #3a93d4 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(24, 119, 242, 0.4);
    color: white !important;
    text-decoration: none;
}

.btn-see-all:visited,
.btn-see-all:link,
.btn-see-all:active {
    color: white !important;
    text-decoration: none;
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

/* Scan Type Badges and Row Styling */
.scan-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
}

.scan-badge.latest {
    background: linear-gradient(135deg, #42b883 0%, #369870 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(66, 184, 131, 0.3);
}

.scan-badge.recent {
    background: linear-gradient(135deg, #1877f2 0%, #166fe5 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(24, 119, 242, 0.3);
}

.latest-scan {
    background: rgba(66, 184, 131, 0.05);
    border-left: 3px solid #42b883;
}

.recent-scan {
    background: rgba(24, 119, 242, 0.05);
    border-left: 3px solid #1877f2;
}

.latest-scan:hover {
    background: rgba(66, 184, 131, 0.1);
}

.recent-scan:hover {
    background: rgba(24, 119, 242, 0.1);
}

.scan-type {
    text-align: center;
    width: 80px;
}

.section-description {
    color: #65676b;
    font-size: 0.95em;
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #1877f2;
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
@media (max-width: 1024px) {
    .container {
        padding: 15px;
    }
    
    .content-grid {
        grid-template-columns: 1fr;
        gap: 20px;
    }
    
    .industry-comparison {
        gap: 15px;
    }
    
    .country-grid {
        gap: 15px;
    }
}

@media (max-width: 768px) {
    .content-grid {
        grid-template-columns: 1fr;
    }
    
    .country-comparison {
        grid-template-columns: 1fr;
    }
    
    .industry-comparison {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .country-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    
    .header {
        padding: 20px;
        margin: -20px -20px 20px -20px;
    }
    
    /* Hide rightmost industry metrics on smaller screens */
    .industry-metrics .metric:nth-child(4) {
        display: none; /* Hide "X sites" count first */
    }
}

@media (max-width: 640px) {
    /* Hide SEO metric next */
    .industry-metrics .metric:nth-child(3) {
        display: none;
    }
}

@media (max-width: 520px) {
    /* Hide Accessibility metric next */
    .industry-metrics .metric:nth-child(2) {
        display: none;
    }
}

@media (max-width: 400px) {
    /* On very small screens, hide all metrics, keep only industry name */
    .industry-metrics {
        display: none;
    }
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

/* ============================================
   ACCESSIBILITY ENHANCEMENTS
   ============================================ */

/* Skip Navigation Link */
/* Enhanced Focus Indicators */
*:focus {
    outline: 3px solid #007bff;
    outline-offset: 2px;
}

button:focus, .btn:focus, input:focus, select:focus, textarea:focus {
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

/* Screen Reader Only Text */
.sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

/* Live Region for Dynamic Announcements */
.live-region {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

/* Offline Badge */
.offline-badge {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    z-index: 10000;
    animation: fadeInPulse 0.5s ease-in-out;
    border: 2px solid rgba(255, 255, 255, 0.2);
}

@keyframes fadeInPulse {
    0% {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
    }
    50% {
        transform: translateY(0) scale(1.05);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.offline-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
}

/* High Contrast Color Improvements for WCAG AA compliance */
.score.excellent, .perf-excellent, .acc-excellent, .seo-excellent, .bp-excellent, .pwa-excellent {
    background: #d1f2eb !important;
    color: #0f5132 !important;
    border: 1px solid #0f5132;
}

.score.good, .perf-good, .acc-good, .seo-good, .bp-good, .pwa-good {
    background: #fff3cd !important;
    color: #664d03 !important;
    border: 1px solid #664d03;
}

.score.average, .perf-average, .acc-average, .seo-average, .bp-average, .pwa-average {
    background: #f8d7da !important;
    color: #721c24 !important;
    border: 1px solid #721c24;
}

.score.poor, .perf-poor, .acc-poor, .seo-poor, .bp-poor, .pwa-poor {
    background: #f5c2c7 !important;
    color: #721c24 !important;
    border: 1px solid #721c24;
}

/* Enhanced Table Accessibility */
table {
    border-collapse: collapse;
    width: 100%;
}

th, td {
    border: 1px solid #dee2e6;
    padding: 12px;
    text-align: left;
}

th {
    background: #f8f9fa;
    font-weight: bold;
    color: #212529;
}

caption {
    padding: 12px;
    font-weight: bold;
    text-align: left;
    background: #e9ecef;
    border: 1px solid #dee2e6;
    border-bottom: none;
    caption-side: top;
}

/* Enhanced Link Accessibility */
a {
    color: #0056b3;
    text-decoration: underline;
}

a:hover, a:focus {
    color: #003d82;
    text-decoration: none;
}

a:visited {
    color: #6f42c1;
}

/* Form Elements Accessibility */
input[type="text"], input[type="search"] {
    border: 2px solid #ced4da;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 16px;
}

input[type="text"]:focus, input[type="search"]:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    outline: none;
}

/* Button Accessibility */
.btn-see-all {
    border: 2px solid transparent;
    transition: all 0.2s ease;
    position: relative;
}

.btn-see-all:focus {
    border-color: #007bff;
    outline: none;
}

/* Country and Industry Rankings Accessibility */
.country-rank, .industry-rank {
    background: #0f4d8c !important;
    color: white !important;
    border: 1px solid #0a3566;
}

/* Enhanced Navigation */
.nav-links {
    list-style: none;
    padding: 0;
    margin: 20px 0;
}

.nav-links li {
    display: inline-block;
    margin-right: 20px;
}

.nav-links a {
    color: #1e3a5f;
    text-decoration: underline;
    font-weight: 500;
}

.nav-links a:hover, .nav-links a:focus {
    background: rgba(247, 147, 30, 0.1);
    color: #f7931e;
    padding: 4px 8px;
    border-radius: 4px;
}

/* Advanced Table Sorting */
.sortable-header {
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 25px !important;
    transition: background-color 0.2s ease;
}

.sortable-header:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
}

.sortable-header:focus {
    outline: 2px solid #007bff;
    outline-offset: -2px;
}

.sort-indicator {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    opacity: 0.6;
    transition: opacity 0.2s ease;
}

.sortable-header.sort-asc .sort-indicator::after {
    content: "▲";
    opacity: 1;
    color: #007bff;
}

.sortable-header.sort-desc .sort-indicator::after {
    content: "▼";
    opacity: 1;
    color: #007bff;
}

.sortable-header:not(.sort-asc):not(.sort-desc) .sort-indicator::after {
    content: "⇅";
}

.sortable-header:hover .sort-indicator {
    opacity: 1;
}

/* Enhanced Trend Arrows */
.trend-arrow {
    font-size: 0.9em;
    font-weight: bold;
    margin-left: 6px;
    display: inline-block;
    transform: translateY(-1px);
    transition: all 0.3s ease;
}

.trend-up {
    color: #28a745;
    animation: trendPulse 2s infinite;
}

.trend-down {
    color: #dc3545;
    animation: trendPulse 2s infinite;
}

.trend-same {
    color: #6c757d;
    opacity: 0.7;
}

@keyframes trendPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Performance Delta Badges */
.performance-delta {
    font-size: 0.7em;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 6px;
    font-weight: 600;
    display: inline-block;
}

.delta-positive {
    background: #d4edda;
    color: #155724;
}

.delta-negative {
    background: #f8d7da;
    color: #721c24;
}

.delta-neutral {
    background: #e2e3e5;
    color: #6c757d;
}

/* Advanced Sorting Controls */
.sorting-controls {
    margin: 15px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.sorting-controls h4 {
    margin: 0 0 10px 0;
    font-size: 0.9em;
    color: #ffffff;
    font-weight: 600;
}

.sort-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.sort-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #ffffff;
}

.sort-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
}

.sort-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.sort-btn.desc {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
}

/* Table Row Highlighting for Trends */
.site-row.trending-up {
    background: linear-gradient(90deg, rgba(40, 167, 69, 0.05) 0%, transparent 100%);
}

.site-row.trending-down {
    background: linear-gradient(90deg, rgba(220, 53, 69, 0.05) 0%, transparent 100%);
}

/* Responsive Enhancements for Trends */
@media (max-width: 768px) {
    .trend-arrow {
        font-size: 0.8em;
        margin-left: 4px;
    }
    
    .performance-delta {
        font-size: 0.6em;
        padding: 1px 4px;
        margin-left: 4px;
    }
    
    .sorting-controls {
        padding: 10px;
    }
    
    .sort-buttons {
        gap: 6px;
    }
    
    .sort-btn {
        padding: 4px 8px;
        font-size: 0.75em;
    }
}

/* Status and Score Announcements */
.score[aria-label]::after {
    content: "";
}

/* Responsive Accessibility */
@media (max-width: 768px) {
    th, td {
        padding: 8px;
        font-size: 14px;
    }
    
    input[type="text"], input[type="search"] {
        font-size: 16px; /* Prevents zoom on iOS */
    }
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
    .score {
        border-width: 2px !important;
    }
    
    .btn-see-all {
        border-width: 3px !important;
    }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
`;

    fs.writeFileSync(path.join(this.outputDir, 'styles.css'), css);

    // Generate Service Worker
    const serviceWorker = `
const CACHE_NAME = 'lighthouse-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
`;

    fs.writeFileSync(path.join(this.outputDir, 'sw.js'), serviceWorker);

    // Generate Web App Manifest
    const manifest = {
      "name": "Valmitta",
      "short_name": "Valmitta",
      "description": "Global website performance analysis with Lighthouse",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#f7931e",
      "theme_color": "#f7931e",
      "icons": [
        {
          "src": "logo.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    };

    fs.writeFileSync(path.join(this.outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  async generateAllCountriesPage() {
    const allScoresWithTrends = await this.db.getLatestScoresWithTrends();
    
    if (allScoresWithTrends.length === 0) {
      console.log('❌ No data found for all countries page.');
      return;
    }

    // Convert to the expected format
    const allScores = allScoresWithTrends.map(row => ({
      url: row.url,
      country: row.country,
      industry: row.industry,
      performance: row.current_performance,
      accessibility: row.current_accessibility,
      best_practices: row.current_best_practices,
      seo: row.current_seo,
      pwa: row.current_pwa,
      test_date: row.test_date
    }));

    const countryStats = this.calculateCountryStats(allScores);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Countries - Valmitta</title>
    <meta name="description" content="Complete rankings of all countries by lighthouse performance analysis">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🌍 All Countries</h1>
            <p class="subtitle">Complete rankings of all ${countryStats.all.length} countries by performance</p>
            <div class="nav-links">
                <a href="index.html" class="nav-link">← Back to Home</a>
            </div>
        </header>

        <section class="section">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search countries..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Country</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Websites</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${countryStats.all.map((country, index) => `
                            <tr class="country-row" data-country="${country.name.toLowerCase()}">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="country-${country.name.toLowerCase().replace(/\s+/g, '-')}.html" class="country-link">${this.getCountryFlag(country.name)} ${country.name}</a></td>
                                <td class="score perf-${this.getScoreClass(country.avgPerformance)}">${country.avgPerformance}%</td>
                                <td class="score acc-${this.getScoreClass(country.avgAccessibility)}">${country.avgAccessibility}%</td>
                                <td class="score seo-${this.getScoreClass(country.avgSeo)}">${country.avgSeo}%</td>
                                <td class="score bp-${this.getScoreClass(country.avgBestPractices)}">${country.avgBestPractices}%</td>
                                <td class="score pwa-${this.getScoreClass(country.avgPwa)}">${country.avgPwa}%</td>
                                <td class="count">${country.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📊 Generated by Valmitta and <a href="mailto:fredu@fredu.com">fredu@fredu.com</a> | ${countryStats.all.length} countries analyzed</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchInput');
            const tableBody = document.getElementById('tableBody');
            const rows = Array.from(tableBody.querySelectorAll('tr'));

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                
                rows.forEach(row => {
                    const countryName = row.getAttribute('data-country');
                    if (countryName.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
            
            // Register service worker for PWA functionality
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => console.log('SW registered', registration))
                    .catch(error => console.log('SW registration failed', error));
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'all-countries.html'), html);
  }

  async generateAllIndustriesPage() {
    const allScoresWithTrends = await this.db.getLatestScoresWithTrends();
    
    if (allScoresWithTrends.length === 0) {
      console.log('❌ No data found for all industries page.');
      return;
    }

    // Convert to the expected format
    const allScores = allScoresWithTrends.map(row => ({
      url: row.url,
      country: row.country,
      industry: row.industry,
      performance: row.current_performance,
      accessibility: row.current_accessibility,
      best_practices: row.current_best_practices,
      seo: row.current_seo,
      pwa: row.current_pwa,
      test_date: row.test_date
    }));

    const industryStats = this.calculateIndustryStats(allScores);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Industries - Valmitta</title>
    <meta name="description" content="Complete rankings of all industries by lighthouse performance analysis">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏭 All Industries</h1>
            <p class="subtitle">Complete rankings of all ${industryStats.all.length} industries by performance</p>
            <div class="nav-links">
                <a href="index.html" class="nav-link">← Back to Home</a>
            </div>
        </header>

        <section class="section">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search industries..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Industry</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Websites</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${industryStats.all.map((industry, index) => `
                            <tr class="industry-row" data-industry="${industry.name.toLowerCase()}">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}.html" class="industry-link">${industry.name}</a></td>
                                <td class="score perf-${this.getScoreClass(industry.avgPerformance)}">${industry.avgPerformance}%</td>
                                <td class="score acc-${this.getScoreClass(industry.avgAccessibility)}">${industry.avgAccessibility}%</td>
                                <td class="score seo-${this.getScoreClass(industry.avgSeo)}">${industry.avgSeo}%</td>
                                <td class="score bp-${this.getScoreClass(industry.avgBestPractices)}">${industry.avgBestPractices}%</td>
                                <td class="score pwa-${this.getScoreClass(industry.avgPwa)}">${industry.avgPwa}%</td>
                                <td class="count">${industry.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📊 Generated by Valmitta | ${industryStats.all.length} industries analyzed</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchInput');
            const tableBody = document.getElementById('tableBody');
            const rows = Array.from(tableBody.querySelectorAll('tr'));

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                
                rows.forEach(row => {
                    const industryName = row.getAttribute('data-industry');
                    if (industryName.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
            
            // Register service worker for PWA functionality
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => console.log('SW registered', registration))
                    .catch(error => console.log('SW registration failed', error));
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'all-industries.html'), html);
  }

  async generateAllCompaniesPage() {
    const allScoresWithTrends = await this.db.getLatestScoresWithTrends();
    
    if (allScoresWithTrends.length === 0) {
      console.log('❌ No data found for all companies page.');
      return;
    }

    // Convert to the expected format and add trend information
    const allScores = allScoresWithTrends.map(row => ({
      url: row.url,
      country: row.country,
      industry: row.industry,
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

    // Sort by performance score (descending)
    const rankedSites = allScores.sort((a, b) => b.performance - a.performance);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Companies - Valmitta</title>
    <meta name="description" content="Complete rankings of all companies by lighthouse performance analysis">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏢 All Companies</h1>
            <p class="subtitle">Complete rankings of all ${rankedSites.length} websites by performance</p>
            <div class="nav-links">
                <a href="index.html" class="nav-link">← Back to Home</a>
            </div>
        </header>

        <section class="section">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search among all ${rankedSites.length} websites..." />
            </div>
            <div class="table-container">
                <table class="results-table" id="resultsTable">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Website</th>
                            <th>Country</th>
                            <th>Industry</th>
                            <th>Performance</th>
                            <th>Accessibility</th>
                            <th>SEO</th>
                            <th>Best Practices</th>
                            <th>PWA</th>
                            <th>Last Scanned</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        ${rankedSites.map((site, index) => `
                            <tr class="site-row" data-url="${site.url}" data-country="${this.normalizeCountry(site.country)}" data-industry="${(site.industry || 'unknown').toLowerCase()}">
                                <td class="rank">#${index + 1}</td>
                                <td><a href="domain-${site.url.replace(/\./g, '-')}.html" class="domain-link">${site.url}</a></td>
                                <td><a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html" class="country-link">${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}</a></td>
                                <td><a href="industry-${(site.industry || 'unknown').toLowerCase().replace(/\s+/g, '-')}.html" class="industry-link">${site.industry || 'Unknown'}</a></td>
                                <td class="score perf-${this.getScoreClass(site.performance)}">${site.performance}% ${this.getTrendArrow(site.performance_trend)}</td>
                                <td class="score acc-${this.getScoreClass(site.accessibility)}">${site.accessibility}%</td>
                                <td class="score seo-${this.getScoreClass(site.seo)}">${site.seo}%</td>
                                <td class="score bp-${this.getScoreClass(site.best_practices)}">${site.best_practices}%</td>
                                <td class="score pwa-${this.getScoreClass(site.pwa)}">${site.pwa}%</td>
                                <td class="date" data-date="${site.test_date}">${new Date(site.test_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="footer">
            <p>📊 Generated by Valmitta | ${rankedSites.length} websites analyzed</p>
            <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchInput');
            const tableBody = document.getElementById('tableBody');
            const rows = Array.from(tableBody.querySelectorAll('tr'));

            // Format all dates on page load
            function formatAllDates() {
                const dateElements = document.querySelectorAll('.date[data-date]');
                dateElements.forEach(element => {
                    const isoDate = element.getAttribute('data-date');
                    const date = new Date(isoDate);
                    element.textContent = date.toLocaleDateString();
                });
            }
            formatAllDates();

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                
                rows.forEach(row => {
                    const url = row.getAttribute('data-url') || '';
                    const country = row.getAttribute('data-country') || '';
                    const industry = row.getAttribute('data-industry') || '';
                    
                    if (url.includes(searchTerm) || country.includes(searchTerm) || industry.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
            
            // Register service worker for PWA functionality
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => console.log('SW registered', registration))
                    .catch(error => console.log('SW registration failed', error));
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'all-companies.html'), html);
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
        avgBestPractices: Math.round(scores.reduce((sum, s) => sum + s.best_practices, 0) / scores.length),
        avgPwa: Math.round(scores.reduce((sum, s) => sum + s.pwa, 0) / scores.length),
        count: scores.length
      };
    }).filter(country => country.count >= 5).sort((a, b) => b.avgPerformance - a.avgPerformance);

    return {
      best: countryAverages[0],
      secondBest: countryAverages.length > 1 ? countryAverages[1] : null,
      worst: countryAverages[countryAverages.length - 1],
      secondWorst: countryAverages.length > 2 ? countryAverages[countryAverages.length - 2] : null,
      all: countryAverages
    };
  }

  calculateIndustryStats(allScores) {
    const byIndustry = {};
    
    allScores.forEach(score => {
      if (!byIndustry[score.industry]) {
        byIndustry[score.industry] = [];
      }
      byIndustry[score.industry].push(score);
    });

    const industryAverages = Object.keys(byIndustry).map(industry => {
      const scores = byIndustry[industry];
      return {
        name: industry,
        avgPerformance: Math.round(scores.reduce((sum, s) => sum + s.performance, 0) / scores.length),
        avgAccessibility: Math.round(scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length),
        avgSeo: Math.round(scores.reduce((sum, s) => sum + s.seo, 0) / scores.length),
        avgBestPractices: Math.round(scores.reduce((sum, s) => sum + s.best_practices, 0) / scores.length),
        avgPwa: Math.round(scores.reduce((sum, s) => sum + s.pwa, 0) / scores.length),
        count: scores.length
      };
    }).filter(industry => industry.count >= 5).sort((a, b) => b.avgPerformance - a.avgPerformance);

    return {
      best: industryAverages[0],
      worst: industryAverages.length > 0 ? industryAverages[industryAverages.length - 1] : null,
      all: industryAverages,
      top5: industryAverages.slice(0, 5)
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

  calculateIndustrySpecificStats(industryScores) {
    return {
      avgPerformance: Math.round(industryScores.reduce((sum, s) => sum + s.performance, 0) / industryScores.length),
      avgAccessibility: Math.round(industryScores.reduce((sum, s) => sum + s.accessibility, 0) / industryScores.length),
      avgSeo: Math.round(industryScores.reduce((sum, s) => sum + s.seo, 0) / industryScores.length),
      avgBestPractices: Math.round(industryScores.reduce((sum, s) => sum + s.best_practices, 0) / industryScores.length)
    };
  }

  normalizeCountry(country) {
    return country === 'Unknown' ? 'Global' : country;
  }

  getCountryUrl(country) {
    if (!country) return '#';
    return `country-${this.normalizeCountry(country).toLowerCase().replace(/\s+/g, '-')}.html`;
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
      'Israel': '🇮🇱',
      'Netherlands': '🇳🇱',
      'Sweden': '🇸🇪',
      'Ireland': '🇮🇪',
      'Austria': '🇦🇹',
      'Poland': '🇵🇱',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Ukraine': '🇺🇦',
      'Hungary': '🇭🇺',
      'Estonia': '🇪🇪',
      'Lithuania': '🇱🇹',
      'Latvia': '🇱🇻',
      'Turkey': '🇹🇷',
      'Italy': '🇮🇹',
      'New Zealand': '🇳🇿',
      'South Africa': '🇿🇦',
      'Egypt': '🇪🇬',
      'Libya': '🇱🇾',
      'Iran': '🇮🇷',
      'Greece': '🇬🇷',
      'Spain': '🇪🇸',
      'France': '🇫🇷',
      'Belgium': '🇧🇪',
      'Luxembourg': '🇱🇺',
      'Switzerland': '🇨🇭',
      'Czechia': '🇨🇿',
      'Slovakia': '🇸🇰',
      'Malta': '🇲🇹',
      'China': '🇨🇳',
      'Vietnam': '🇻🇳',
      'Thailand': '🇹🇭',
      'Malaysia': '🇲🇾',
      'Singapore': '🇸🇬',
      'Indonesia': '🇮🇩',
      'Taiwan': '🇹🇼',
      'Peru': '🇵🇪',
      'Colombia': '🇨🇴',
      'Costa Rica': '🇨🇷',
      'Cuba': '🇨🇺',
      'Bolivia': '🇧🇴',
      'Chile': '🇨🇱',
      'Paraguay': '🇵🇾',
      'Uruguay': '🇺🇾',
      'Zambia': '🇿🇲',
      'Kenya': '🇰🇪',
      'Angola': '🇦🇴',
      'Namibia': '🇳🇦',
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

  getScoreDescription(score) {
    if (score >= 90) return 'excellent performance';
    if (score >= 70) return 'good performance';
    if (score >= 50) return 'average performance';
    return 'needs improvement';
  }

  getDetailedScoreDescription(score, type) {
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

  async generateLatestUpdatedPage() {
    console.log('📅 Generating Latest Updated Statistics page...');
    
    const recentScanResults = await this.db.getRecentScanResults();
    
    if (recentScanResults.length === 0) {
      console.log('❌ No data found for latest updated statistics page.');
      return;
    }

    // Separate latest scan from recent scans
    const latestScanResults = recentScanResults.filter(row => row.scan_type === 'latest');
    const recentResults = recentScanResults.filter(row => row.scan_type === 'recent');
    
    // Get the scan date for display
    const latestScanDate = latestScanResults[0].test_date;
    const scanDate = new Date(latestScanDate);
    const formattedScanDate = scanDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculate statistics for the latest scan
    const stats = this.calculateStatsForScores(latestScanResults);
    
    // Calculate time range for recent scans
    const cutoffTime = new Date(scanDate.getTime() - (120 * 60 * 1000));
    const formattedCutoffTime = cutoffTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Latest Updated Statistics - Valmitta</title>
    <meta name="description" content="Latest lighthouse performance scan results from ${formattedScanDate} - ${latestScanResults.length} websites analyzed">
    <meta name="theme-color" content="#1877f2">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231877f2'/><text x='50' y='75' font-size='70' text-anchor='middle' fill='%23FFD700'>🏆</text></svg>">
    <link rel="manifest" href="manifest.json">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header class="header" role="banner">
            <nav class="breadcrumb" aria-label="Breadcrumb navigation">
                <ol class="breadcrumb-list">
                    <li><a href="index.html" aria-label="Return to homepage">🏠 Home</a></li>
                    <li aria-current="page">📅 Latest Updated Statistics</li>
                </ol>
            </nav>
            <h1>📅 Latest Updated Statistics</h1>
            <p class="subtitle">
                Most recent lighthouse scan from <time datetime="${latestScanDate}">${formattedScanDate}</time>
            </p>
        </header>

        <section class="stats-grid" aria-labelledby="stats-heading">
            <h2 id="stats-heading" class="sr-only">Performance Statistics for Latest Scan</h2>
            <div class="stat-card performance" role="img" aria-label="Average performance score: ${stats.avgPerformance} percent">
                <h3>Average Performance</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgPerformance}%</div>
                <p class="sr-only">Performance measures loading speed and user experience</p>
            </div>
            <div class="stat-card accessibility" role="img" aria-label="Average accessibility score: ${stats.avgAccessibility} percent">
                <h3>Average Accessibility</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgAccessibility}%</div>
                <p class="sr-only">Accessibility measures compliance with web standards for users with disabilities</p>
            </div>
            <div class="stat-card seo" role="img" aria-label="Average SEO score: ${stats.avgSeo} percent">
                <h3>Average SEO</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgSeo}%</div>
                <p class="sr-only">SEO measures search engine optimization and discoverability</p>
            </div>
            <div class="stat-card best-practices" role="img" aria-label="Average best practices score: ${stats.avgBestPractices} percent">
                <h3>Best Practices</h3>
                <div class="stat-number" aria-hidden="true">${stats.avgBestPractices}%</div>
                <p class="sr-only">Best practices measures security and modern web standards compliance</p>
            </div>
        </section>

        <main id="main-content" role="main">
            <section class="section" aria-labelledby="websites-heading">
                <h2 id="websites-heading">🚀 Latest & Recent Scan Results</h2>
                <div class="search-container">
                    <label for="searchInput" class="sr-only">Search recently scanned websites by name, country, or industry</label>
                    <input type="text" 
                           id="searchInput" 
                           placeholder="🔍 Search recently scanned websites..." 
                           aria-describedby="search-help"
                           autocomplete="off" />
                    <div id="search-help" class="sr-only">Type to filter websites by name, country, or industry. Results update automatically as you type.</div>
                    <div id="search-results-announced" class="sr-only" aria-live="polite" aria-atomic="true"></div>
                </div>
                <div class="table-container">
                    <table class="results-table" id="resultsTable" role="table" aria-labelledby="websites-heading">
                        <caption class="sr-only">
                            Lighthouse performance data for ${recentScanResults.length} websites from recent scans, 
                            including the latest scan on ${formattedScanDate} and scans within the previous 120 minutes,
                            sorted by scan time and performance score. 
                            Table includes website URL, country, industry, scan type, and scores for performance, accessibility, SEO, best practices, and PWA compliance.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col" aria-sort="none">Rank</th>
                                <th scope="col" aria-sort="none">Website</th>
                                <th scope="col" aria-sort="none">Country</th>
                                <th scope="col" aria-sort="none">Industry</th>
                                <th scope="col" aria-sort="none">Scan Type</th>
                                <th scope="col" aria-sort="descending" aria-label="Performance score, currently sorted descending">Performance</th>
                                <th scope="col" aria-sort="none">Accessibility</th>
                                <th scope="col" aria-sort="none">SEO</th>
                                <th scope="col" aria-sort="none">Best Practices</th>
                                <th scope="col" aria-sort="none">PWA</th>
                                <th scope="col" aria-sort="none">Scan Time</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            ${recentScanResults.map((site, index) => `
                                <tr class="site-row ${site.scan_type === 'latest' ? 'latest-scan' : 'recent-scan'}">
                                    <td class="rank" aria-label="Rank ${index + 1}">#${index + 1}</td>
                                    <td>
                                        <a href="domain-${site.url.replace(/\./g, '-')}.html" 
                                           class="domain-link"
                                           aria-label="View detailed report for ${site.url}">
                                            ${site.url}
                                        </a>
                                    </td>
                                    <td>
                                        <a href="country-${this.normalizeCountry(site.country).toLowerCase().replace(/\s+/g, '-')}.html" 
                                           class="country-link"
                                           aria-label="View all websites from ${this.normalizeCountry(site.country)}">
                                            ${this.getCountryFlag(site.country)} ${this.normalizeCountry(site.country)}
                                        </a>
                                    </td>
                                    <td>
                                        <a href="industry-${(site.industry || 'unknown').toLowerCase().replace(/\s+/g, '-')}.html" 
                                           class="industry-link"
                                           aria-label="View all ${site.industry || 'Unknown'} industry websites">
                                            ${site.industry || 'Unknown'}
                                        </a>
                                    </td>
                                    <td class="scan-type ${site.scan_type}"
                                        aria-label="Scan type: ${site.scan_type === 'latest' ? 'Latest scan' : 'Recent scan'}">
                                        <span class="scan-badge ${site.scan_type}">
                                            ${site.scan_type === 'latest' ? '🎯 Latest' : '📅 Recent'}
                                        </span>
                                    </td>
                                    <td class="score perf-${this.getScoreClass(site.performance)}"
                                        aria-label="Performance score: ${site.performance} percent, ${this.getScoreDescription(site.performance)}">
                                        ${site.performance}%
                                    </td>
                                    <td class="score acc-${this.getScoreClass(site.accessibility)}"
                                        aria-label="Accessibility score: ${site.accessibility} percent, ${this.getScoreDescription(site.accessibility)}">
                                        ${site.accessibility}%
                                    </td>
                                    <td class="score seo-${this.getScoreClass(site.seo)}"
                                        aria-label="SEO score: ${site.seo} percent, ${this.getScoreDescription(site.seo)}">
                                        ${site.seo}%
                                    </td>
                                    <td class="score bp-${this.getScoreClass(site.best_practices)}"
                                        aria-label="Best Practices score: ${site.best_practices} percent, ${this.getScoreDescription(site.best_practices)}">
                                        ${site.best_practices}%
                                    </td>
                                    <td class="score pwa-${this.getScoreClass(site.pwa)}"
                                        aria-label="PWA score: ${site.pwa} percent, ${this.getScoreDescription(site.pwa)}">
                                        ${site.pwa}%
                                    </td>
                                    <td class="date" data-date="${site.test_date}"
                                        aria-label="Scanned at ${new Date(site.test_date).toLocaleString()}">
                                        <time datetime="${site.test_date}">${new Date(site.test_date).toLocaleTimeString()}</time>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>

        <footer class="footer" role="contentinfo">
            <div class="footer-content">
                <p>📅 Latest Scan Data from <time datetime="${latestScanDate}">${formattedScanDate}</time></p>
                <p>🚀 <a href="https://flipsite.io" target="_blank" rel="noopener" aria-label="Visit flipsite.io to build high-performing websites">Build websites that score 100% on all lighthouse tests with flipsite.io</a></p>
                <div class="footer-meta">
                    <p><small><a href="index.html" aria-label="Back to global homepage">← Back to Global View</a></small></p>
                    <p><small>Accessibility: WCAG 2.1 AA compliant</small></p>
                </div>
            </div>
        </footer>
    </div>

    <script>
        const latestScanData = ${JSON.stringify(latestScanResults)};
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('tableBody');
        const liveRegion = document.getElementById('search-results-announced');
        let searchTimeout;
        
        // Enhanced search functionality with accessibility features
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            // Clear previous timeout to debounce search
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const filtered = latestScanData.filter(site => 
                    site.url.toLowerCase().includes(query) ||
                    site.country.toLowerCase().includes(query) ||
                    (site.industry && site.industry.toLowerCase().includes(query))
                );
                
                updateLatestScanTable(filtered);
                
                // Announce results to screen readers
                let announcement = '';
                if (query.trim() === '') {
                    announcement = \`Showing all \${latestScanData.length} websites from latest scan\`;
                } else if (filtered.length === 0) {
                    announcement = \`No results found for "\${query}" in latest scan\`;
                } else {
                    announcement = \`Found \${filtered.length} result\${filtered.length === 1 ? '' : 's'} for "\${query}" in latest scan\`;
                }
                
                if (liveRegion) {
                    liveRegion.textContent = announcement;
                }
            }, 300);
        });
        
        function updateLatestScanTable(sites) {
            tableBody.innerHTML = sites.map((site, index) => \`
                <tr class="site-row">
                    <td class="rank" aria-label="Rank \${index + 1}">#\${index + 1}</td>
                    <td>
                        <a href="domain-\${site.url.replace(/\\./g, '-')}.html" 
                           class="domain-link"
                           aria-label="View detailed report for \${site.url}">
                            \${site.url}
                        </a>
                    </td>
                    <td>
                        <a href="country-\${normalizeCountry(site.country).toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="country-link"
                           aria-label="View all websites from \${normalizeCountry(site.country)}">
                            \${getCountryFlag(site.country)} \${normalizeCountry(site.country)}
                        </a>
                    </td>
                    <td>
                        <a href="industry-\${(site.industry || 'unknown').toLowerCase().replace(/\\s+/g, '-')}.html" 
                           class="industry-link"
                           aria-label="View all \${site.industry || 'Unknown'} industry websites">
                            \${site.industry || 'Unknown'}
                        </a>
                    </td>
                    <td class="score perf-\${getScoreClass(site.performance)}"
                        aria-label="Performance score: \${site.performance} percent, \${getScoreDescription(site.performance)}">
                        \${site.performance}%
                    </td>
                    <td class="score acc-\${getScoreClass(site.accessibility)}"
                        aria-label="Accessibility score: \${site.accessibility} percent, \${getScoreDescription(site.accessibility)}">
                        \${site.accessibility}%
                    </td>
                    <td class="score seo-\${getScoreClass(site.seo)}"
                        aria-label="SEO score: \${site.seo} percent, \${getScoreDescription(site.seo)}">
                        \${site.seo}%
                    </td>
                    <td class="score bp-\${getScoreClass(site.best_practices)}"
                        aria-label="Best Practices score: \${site.best_practices} percent, \${getScoreDescription(site.best_practices)}">
                        \${site.best_practices}%
                    </td>
                    <td class="score pwa-\${getScoreClass(site.pwa)}"
                        aria-label="PWA score: \${site.pwa} percent, \${getScoreDescription(site.pwa)}">
                        \${site.pwa}%
                    </td>
                    <td class="date" data-date="\${site.test_date}"
                        aria-label="Scanned at \${new Date(site.test_date).toLocaleString()}">
                        <time datetime="\${site.test_date}">\${new Date(site.test_date).toLocaleTimeString()}</time>
                    </td>
                </tr>
            \`).join('');
        }
        
        function getScoreClass(score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
        
        function getScoreDescription(score) {
            if (score >= 90) return 'excellent performance';
            if (score >= 70) return 'good performance';
            if (score >= 50) return 'average performance';
            return 'needs improvement';
        }
        
        function normalizeCountry(country) {
            return country === 'Unknown' ? 'Global' : country;
        }
        
        function getCountryFlag(country) {
            const flags = {
                'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
                'India': '🇮🇳', 'Brazil': '🇧🇷', 'Japan': '🇯🇵', 'Canada': '🇨🇦',
                'Australia': '🇦🇺', 'Russia': '🇷🇺', 'South Korea': '🇰🇷',
                'Finland': '🇫🇮', 'Sweden': '🇸🇪', 'Netherlands': '🇳🇱',
                'Israel': '🇮🇱', 'Global': '🌍', 'Unknown': '🌍'
            };
            return flags[country] || '🌍';
        }
        
        // Format dates in user's locale
        function formatAllDates() {
            const dateCells = document.querySelectorAll('td.date[data-date]');
            dateCells.forEach(cell => {
                const dateString = cell.getAttribute('data-date');
                if (dateString) {
                    const date = new Date(dateString);
                    cell.querySelector('time').textContent = date.toLocaleTimeString();
                }
            });
        }
        
        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', function() {
            formatAllDates();
        });
        
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('SW registered', registration))
                .catch(error => console.log('SW registration failed', error));
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputDir, 'latest-updated.html'), html);
    console.log('✅ Latest Updated Statistics page generated successfully');
  }

  calculateStatsForScores(scores) {
    if (scores.length === 0) {
      return {
        avgPerformance: 0,
        avgAccessibility: 0,
        avgSeo: 0,
        avgBestPractices: 0,
        avgPwa: 0
      };
    }

    const totals = scores.reduce((acc, score) => {
      acc.performance += score.performance || 0;
      acc.accessibility += score.accessibility || 0;
      acc.seo += score.seo || 0;
      acc.best_practices += score.best_practices || 0;
      acc.pwa += score.pwa || 0;
      return acc;
    }, { performance: 0, accessibility: 0, seo: 0, best_practices: 0, pwa: 0 });

    return {
      avgPerformance: Math.round(totals.performance / scores.length),
      avgAccessibility: Math.round(totals.accessibility / scores.length),
      avgSeo: Math.round(totals.seo / scores.length),
      avgBestPractices: Math.round(totals.best_practices / scores.length),
      avgPwa: Math.round(totals.pwa / scores.length)
    };
  }

  getOfflineBadgeHTML() {
    return `    <!-- Offline Badge -->
    <div id="offline-badge" class="offline-badge" style="display: none;">
        🔌 Website Offline
    </div>`;
  }

  getOfflineDetectionJS() {
    return `        // Offline Detection and Badge Management
        function updateOfflineStatus() {
            const offlineBadge = document.getElementById('offline-badge');
            if (!navigator.onLine) {
                offlineBadge.style.display = 'block';
                console.log('📵 Website is now offline');
            } else {
                offlineBadge.style.display = 'none';
                console.log('🌐 Website is now online');
            }
        }

        // Check offline status on page load
        window.addEventListener('load', updateOfflineStatus);

        // Listen for online/offline events
        window.addEventListener('online', updateOfflineStatus);
        window.addEventListener('offline', updateOfflineStatus);

        // Initial check
        updateOfflineStatus();`;
  }
}

module.exports = WebsiteGenerator;

// Main execution
async function main() {
  const generator = new WebsiteGenerator();
  await generator.generateWebsite();
}

main().catch(console.error);