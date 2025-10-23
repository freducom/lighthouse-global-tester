const Database = require('./database');
const fs = require('fs');
const path = require('path');

class APIGenerator {
  constructor() {
    this.db = new Database();
    this.outputDir = './website/api';
    this.domainsData = JSON.parse(fs.readFileSync('./domains.json', 'utf8'));
  }

  async generateAPI() {
    console.log('🔌 Generating JSON API endpoints...');
    
    // Create API directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Generate all API endpoints
    await this.generateOverviewAPI();
    await this.generateCountriesAPI();
    await this.generateIndustriesAPI();
    await this.generateWebsitesAPI();
    await this.generateStatsAPI();
    await this.generateCountrySpecificAPIs();
    await this.generateIndustrySpecificAPIs();
    await this.generateWebsiteSpecificAPIs();
    await this.generateLatestUpdatesAPI();
    await this.generateTrendsAPI();
    
    console.log('✅ JSON API generated successfully!');
    console.log(`📂 API files are in: ${this.outputDir}`);
  }

  async generateOverviewAPI() {
    try {
      const allScores = await this.db.getAllLatestScores();
      const latestScanResults = await this.db.getLatestScanResults();
      
      const overview = {
        meta: {
          generated_at: new Date().toISOString(),
          api_version: "1.0",
          total_websites: allScores.length,
          countries_count: [...new Set(allScores.map(s => s.country))].length,
          industries_count: [...new Set(allScores.map(s => s.industry))].length,
          last_scan_date: latestScanResults.length > 0 ? latestScanResults[0].test_date : null
        },
        global_averages: this.calculateGlobalAverages(allScores),
        top_performers: {
          performance: allScores.sort((a, b) => b.performance - a.performance).slice(0, 10),
          accessibility: allScores.sort((a, b) => b.accessibility - a.accessibility).slice(0, 10),
          best_practices: allScores.sort((a, b) => b.best_practices - a.best_practices).slice(0, 10),
          seo: allScores.sort((a, b) => b.seo - a.seo).slice(0, 10),
          pwa: allScores.sort((a, b) => b.pwa - a.pwa).slice(0, 10)
        },
        bottom_performers: {
          performance: allScores.sort((a, b) => a.performance - b.performance).slice(0, 10),
          accessibility: allScores.sort((a, b) => a.accessibility - b.accessibility).slice(0, 10),
          best_practices: allScores.sort((a, b) => a.best_practices - b.best_practices).slice(0, 10),
          seo: allScores.sort((a, b) => a.seo - b.seo).slice(0, 10),
          pwa: allScores.sort((a, b) => a.pwa - b.pwa).slice(0, 10)
        }
      };

      fs.writeFileSync(path.join(this.outputDir, 'overview.json'), JSON.stringify(overview, null, 2));
    } catch (error) {
      console.error('Error generating overview API:', error);
    }
  }

  async generateCountriesAPI() {
    try {
      const allScores = await this.db.getAllLatestScores();
      const countriesMap = new Map();
      
      // Group scores by country
      allScores.forEach(score => {
        if (!countriesMap.has(score.country)) {
          countriesMap.set(score.country, []);
        }
        countriesMap.get(score.country).push(score);
      });

      const countries = Array.from(countriesMap.entries()).map(([country, scores]) => ({
        country,
        website_count: scores.length,
        averages: this.calculateGlobalAverages(scores),
        flag: this.getCountryFlag(country),
        api_endpoint: `countries/${this.normalizeForUrl(country)}.json`
      })).sort((a, b) => a.country.localeCompare(b.country));

      fs.writeFileSync(path.join(this.outputDir, 'countries.json'), JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          total_countries: countries.length
        },
        countries
      }, null, 2));
    } catch (error) {
      console.error('Error generating countries API:', error);
    }
  }

  async generateIndustriesAPI() {
    try {
      const allScores = await this.db.getAllLatestScores();
      const industriesMap = new Map();
      
      // Group scores by industry
      allScores.forEach(score => {
        const industry = score.industry || 'Unknown';
        if (!industriesMap.has(industry)) {
          industriesMap.set(industry, []);
        }
        industriesMap.get(industry).push(score);
      });

      const industries = Array.from(industriesMap.entries()).map(([industry, scores]) => ({
        industry,
        website_count: scores.length,
        averages: this.calculateGlobalAverages(scores),
        api_endpoint: `industries/${this.normalizeForUrl(industry)}.json`
      })).sort((a, b) => a.industry.localeCompare(b.industry));

      fs.writeFileSync(path.join(this.outputDir, 'industries.json'), JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          total_industries: industries.length
        },
        industries
      }, null, 2));
    } catch (error) {
      console.error('Error generating industries API:', error);
    }
  }

  async generateWebsitesAPI() {
    try {
      const allScores = await this.db.getAllLatestScores();
      
      const websites = allScores.map(score => ({
        url: score.url,
        country: score.country,
        industry: score.industry || 'Unknown',
        scores: {
          performance: score.performance,
          accessibility: score.accessibility,
          best_practices: score.best_practices,
          seo: score.seo,
          pwa: score.pwa
        },
        test_date: score.test_date,
        api_endpoint: `websites/${this.normalizeForUrl(score.url)}.json`
      })).sort((a, b) => a.url.localeCompare(b.url));

      fs.writeFileSync(path.join(this.outputDir, 'websites.json'), JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          total_websites: websites.length
        },
        websites
      }, null, 2));
    } catch (error) {
      console.error('Error generating websites API:', error);
    }
  }

  async generateStatsAPI() {
    try {
      const allScores = await this.db.getAllLatestScores();
      
      const stats = {
        meta: {
          generated_at: new Date().toISOString(),
          total_websites: allScores.length
        },
        distribution: {
          performance: this.calculateScoreDistribution(allScores, 'performance'),
          accessibility: this.calculateScoreDistribution(allScores, 'accessibility'),
          best_practices: this.calculateScoreDistribution(allScores, 'best_practices'),
          seo: this.calculateScoreDistribution(allScores, 'seo'),
          pwa: this.calculateScoreDistribution(allScores, 'pwa')
        },
        by_country: this.calculateStatsByDimension(allScores, 'country'),
        by_industry: this.calculateStatsByDimension(allScores, 'industry')
      };

      fs.writeFileSync(path.join(this.outputDir, 'stats.json'), JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Error generating stats API:', error);
    }
  }

  async generateCountrySpecificAPIs() {
    try {
      // Create countries subdirectory
      const countriesDir = path.join(this.outputDir, 'countries');
      if (!fs.existsSync(countriesDir)) {
        fs.mkdirSync(countriesDir, { recursive: true });
      }

      for (const countryData of this.domainsData) {
        const countryScores = await this.db.getScoresByCountry(countryData.country);
        
        if (countryScores.length === 0) continue;

        const countryAPI = {
          meta: {
            generated_at: new Date().toISOString(),
            country: countryData.country,
            flag: this.getCountryFlag(countryData.country),
            website_count: countryScores.length
          },
          averages: this.calculateGlobalAverages(countryScores),
          websites: countryScores.map(score => ({
            url: score.url,
            industry: score.industry || 'Unknown',
            scores: {
              performance: score.performance,
              accessibility: score.accessibility,
              best_practices: score.best_practices,
              seo: score.seo,
              pwa: score.pwa
            },
            test_date: score.test_date
          })),
          industries: this.calculateStatsByDimension(countryScores, 'industry')
        };

        const filename = `${this.normalizeForUrl(countryData.country)}.json`;
        fs.writeFileSync(path.join(countriesDir, filename), JSON.stringify(countryAPI, null, 2));
      }
    } catch (error) {
      console.error('Error generating country-specific APIs:', error);
    }
  }

  async generateIndustrySpecificAPIs() {
    try {
      // Create industries subdirectory
      const industriesDir = path.join(this.outputDir, 'industries');
      if (!fs.existsSync(industriesDir)) {
        fs.mkdirSync(industriesDir, { recursive: true });
      }

      const allScores = await this.db.getAllLatestScores();
      const industries = [...new Set(allScores.map(score => score.industry).filter(industry => industry))];

      for (const industry of industries) {
        const industryScores = allScores.filter(score => score.industry === industry);
        
        const industryAPI = {
          meta: {
            generated_at: new Date().toISOString(),
            industry: industry,
            website_count: industryScores.length
          },
          averages: this.calculateGlobalAverages(industryScores),
          websites: industryScores.map(score => ({
            url: score.url,
            country: score.country,
            scores: {
              performance: score.performance,
              accessibility: score.accessibility,
              best_practices: score.best_practices,
              seo: score.seo,
              pwa: score.pwa
            },
            test_date: score.test_date
          })),
          countries: this.calculateStatsByDimension(industryScores, 'country')
        };

        const filename = `${this.normalizeForUrl(industry)}.json`;
        fs.writeFileSync(path.join(industriesDir, filename), JSON.stringify(industryAPI, null, 2));
      }
    } catch (error) {
      console.error('Error generating industry-specific APIs:', error);
    }
  }

  async generateWebsiteSpecificAPIs() {
    try {
      // Create websites subdirectory
      const websitesDir = path.join(this.outputDir, 'websites');
      if (!fs.existsSync(websitesDir)) {
        fs.mkdirSync(websitesDir, { recursive: true });
      }

      const allScores = await this.db.getAllLatestScores();

      for (const score of allScores) {
        // Get historical data for this website
        const historicalScores = await this.db.getScores(score.url, 50);
        
        const websiteAPI = {
          meta: {
            generated_at: new Date().toISOString(),
            url: score.url,
            country: score.country,
            industry: score.industry || 'Unknown'
          },
          latest_scores: {
            performance: score.performance,
            accessibility: score.accessibility,
            best_practices: score.best_practices,
            seo: score.seo,
            pwa: score.pwa,
            test_date: score.test_date
          },
          historical_data: historicalScores.map(historical => ({
            performance: historical.performance,
            accessibility: historical.accessibility,
            best_practices: historical.best_practices,
            seo: historical.seo,
            pwa: historical.pwa,
            test_date: historical.test_date
          })),
          trends: this.calculateWebsiteTrends(historicalScores)
        };

        const filename = `${this.normalizeForUrl(score.url)}.json`;
        fs.writeFileSync(path.join(websitesDir, filename), JSON.stringify(websiteAPI, null, 2));
      }
    } catch (error) {
      console.error('Error generating website-specific APIs:', error);
    }
  }

  async generateLatestUpdatesAPI() {
    try {
      const latestScanResults = await this.db.getLatestScanResults();
      
      const latestUpdates = {
        meta: {
          generated_at: new Date().toISOString(),
          scan_count: latestScanResults.length,
          scan_date: latestScanResults.length > 0 ? latestScanResults[0].test_date : null
        },
        results: latestScanResults.map(result => ({
          url: result.url,
          country: result.country,
          industry: result.industry || 'Unknown',
          scores: {
            performance: result.performance,
            accessibility: result.accessibility,
            best_practices: result.best_practices,
            seo: result.seo,
            pwa: result.pwa
          },
          test_date: result.test_date
        })),
        summary: {
          averages: this.calculateGlobalAverages(latestScanResults),
          top_performers: latestScanResults.sort((a, b) => b.performance - a.performance).slice(0, 5),
          countries_scanned: [...new Set(latestScanResults.map(r => r.country))].length,
          industries_scanned: [...new Set(latestScanResults.map(r => r.industry))].length
        }
      };

      fs.writeFileSync(path.join(this.outputDir, 'latest-updates.json'), JSON.stringify(latestUpdates, null, 2));
    } catch (error) {
      console.error('Error generating latest updates API:', error);
    }
  }

  async generateTrendsAPI() {
    try {
      const trendsData = await this.db.getLatestScoresWithTrends();
      
      const trends = {
        meta: {
          generated_at: new Date().toISOString(),
          websites_with_trends: trendsData.filter(t => t.previous_performance !== null).length,
          total_websites: trendsData.length
        },
        global_trends: this.calculateGlobalTrends(trendsData),
        website_trends: trendsData
          .filter(t => t.previous_performance !== null)
          .map(trend => ({
            url: trend.url,
            country: trend.country,
            industry: trend.industry || 'Unknown',
            current_scores: {
              performance: trend.current_performance,
              accessibility: trend.current_accessibility,
              best_practices: trend.current_best_practices,
              seo: trend.current_seo,
              pwa: trend.current_pwa
            },
            previous_scores: {
              performance: trend.previous_performance,
              accessibility: trend.previous_accessibility,
              best_practices: trend.previous_best_practices,
              seo: trend.previous_seo,
              pwa: trend.previous_pwa
            },
            changes: {
              performance: trend.current_performance - trend.previous_performance,
              accessibility: trend.current_accessibility - trend.previous_accessibility,
              best_practices: trend.current_best_practices - trend.previous_best_practices,
              seo: trend.current_seo - trend.previous_seo,
              pwa: trend.current_pwa - trend.previous_pwa
            }
          }))
      };

      fs.writeFileSync(path.join(this.outputDir, 'trends.json'), JSON.stringify(trends, null, 2));
    } catch (error) {
      console.error('Error generating trends API:', error);
    }
  }

  // Helper methods
  calculateGlobalAverages(scores) {
    if (!scores || scores.length === 0) return null;
    
    return {
      performance: Math.round(scores.reduce((sum, s) => sum + s.performance, 0) / scores.length),
      accessibility: Math.round(scores.reduce((sum, s) => sum + s.accessibility, 0) / scores.length),
      best_practices: Math.round(scores.reduce((sum, s) => sum + s.best_practices, 0) / scores.length),
      seo: Math.round(scores.reduce((sum, s) => sum + s.seo, 0) / scores.length),
      pwa: Math.round(scores.reduce((sum, s) => sum + s.pwa, 0) / scores.length)
    };
  }

  calculateScoreDistribution(scores, metric) {
    const distribution = {
      excellent: 0, // 90-100
      good: 0,      // 70-89
      average: 0,   // 50-69
      poor: 0       // 0-49
    };

    scores.forEach(score => {
      const value = score[metric];
      if (value >= 90) distribution.excellent++;
      else if (value >= 70) distribution.good++;
      else if (value >= 50) distribution.average++;
      else distribution.poor++;
    });

    return distribution;
  }

  calculateStatsByDimension(scores, dimension) {
    const stats = new Map();
    
    scores.forEach(score => {
      const key = score[dimension] || 'Unknown';
      if (!stats.has(key)) {
        stats.set(key, []);
      }
      stats.get(key).push(score);
    });

    return Array.from(stats.entries()).map(([key, groupScores]) => ({
      [dimension]: key,
      website_count: groupScores.length,
      averages: this.calculateGlobalAverages(groupScores)
    })).sort((a, b) => a[dimension].localeCompare(b[dimension]));
  }

  calculateWebsiteTrends(historicalScores) {
    if (historicalScores.length < 2) return null;

    const latest = historicalScores[0];
    const previous = historicalScores[1];

    return {
      performance: latest.performance - previous.performance,
      accessibility: latest.accessibility - previous.accessibility,
      best_practices: latest.best_practices - previous.best_practices,
      seo: latest.seo - previous.seo,
      pwa: latest.pwa - previous.pwa,
      test_date_current: latest.test_date,
      test_date_previous: previous.test_date
    };
  }

  calculateGlobalTrends(trendsData) {
    const validTrends = trendsData.filter(t => t.previous_performance !== null);
    
    if (validTrends.length === 0) return null;

    const changes = {
      performance: validTrends.map(t => t.current_performance - t.previous_performance),
      accessibility: validTrends.map(t => t.current_accessibility - t.previous_accessibility),
      best_practices: validTrends.map(t => t.current_best_practices - t.previous_best_practices),
      seo: validTrends.map(t => t.current_seo - t.previous_seo),
      pwa: validTrends.map(t => t.current_pwa - t.previous_pwa)
    };

    return {
      average_changes: {
        performance: Math.round(changes.performance.reduce((sum, c) => sum + c, 0) / changes.performance.length * 10) / 10,
        accessibility: Math.round(changes.accessibility.reduce((sum, c) => sum + c, 0) / changes.accessibility.length * 10) / 10,
        best_practices: Math.round(changes.best_practices.reduce((sum, c) => sum + c, 0) / changes.best_practices.length * 10) / 10,
        seo: Math.round(changes.seo.reduce((sum, c) => sum + c, 0) / changes.seo.length * 10) / 10,
        pwa: Math.round(changes.pwa.reduce((sum, c) => sum + c, 0) / changes.pwa.length * 10) / 10
      },
      improvements: {
        performance: changes.performance.filter(c => c > 0).length,
        accessibility: changes.accessibility.filter(c => c > 0).length,
        best_practices: changes.best_practices.filter(c => c > 0).length,
        seo: changes.seo.filter(c => c > 0).length,
        pwa: changes.pwa.filter(c => c > 0).length
      },
      declines: {
        performance: changes.performance.filter(c => c < 0).length,
        accessibility: changes.accessibility.filter(c => c < 0).length,
        best_practices: changes.best_practices.filter(c => c < 0).length,
        seo: changes.seo.filter(c => c < 0).length,
        pwa: changes.pwa.filter(c => c < 0).length
      }
    };
  }

  normalizeForUrl(str) {
    return str.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
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
}

// Export for use in other files
module.exports = APIGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new APIGenerator();
  generator.generateAPI().catch(console.error);
}