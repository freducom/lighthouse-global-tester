const chromeLauncher = require('chrome-launcher');

class LighthouseRunner {
  constructor() {
    this.lighthouse = null;
  }

  async _initLighthouse() {
    if (!this.lighthouse) {
      // Use dynamic import for ESM module
      const lighthouseModule = await import('lighthouse');
      this.lighthouse = lighthouseModule.default || lighthouseModule;
    }
    return this.lighthouse;
  }

  async runAudit(url) {
    let chrome;
    
    try {
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      chrome = await chromeLauncher.launch({
        chromeFlags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      
      const options = {
        logLevel: 'error',
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        port: chrome.port,
        chromeFlags: ['--disable-storage-reset']
      };

      console.log(`Running Lighthouse audit for ${url}...`);
      const lighthouse = await this._initLighthouse();
      const runnerResult = await lighthouse(url, options);
      
      if (!runnerResult || !runnerResult.lhr || !runnerResult.lhr.categories) {
        throw new Error('Invalid Lighthouse result');
      }

      const categories = runnerResult.lhr.categories;
      
      const scores = {
        performance: categories.performance?.score ? Math.round(categories.performance.score * 100) : 0,
        accessibility: categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : 0,
        bestPractices: categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : 0,
        seo: categories.seo?.score ? Math.round(categories.seo.score * 100) : 0,
        pwa: categories.pwa?.score ? Math.round(categories.pwa.score * 100) : 0
      };

      return scores;
    } catch (error) {
      console.error(`Error auditing ${url}:`, error.message);
      throw error;
    } finally {
      if (chrome) {
        await chrome.kill();
      }
    }
  }
}

module.exports = LighthouseRunner;