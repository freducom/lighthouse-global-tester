const chromeLauncher = require('chrome-launcher');

class LighthouseRunner {
  constructor() {
    this.lighthouse = null;
    this.maxRetries = 2;
    this.retryDelay = 3000; // 3 seconds between retries
    this.auditTimeout = 60000; // 60 seconds timeout per audit
  }

  async _initLighthouse() {
    if (!this.lighthouse) {
      // Use dynamic import for ESM module
      const lighthouseModule = await import('lighthouse');
      this.lighthouse = lighthouseModule.default || lighthouseModule;
    }
    return this.lighthouse;
  }

  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAudit(url, retryCount = 0) {
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
      
      // Run lighthouse with timeout
      const runnerResult = await Promise.race([
        lighthouse(url, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Lighthouse audit timeout after ${this.auditTimeout}ms`)), this.auditTimeout)
        )
      ]);
      
      if (!runnerResult || !runnerResult.lhr || !runnerResult.lhr.categories) {
        throw new Error('Invalid Lighthouse result - missing categories data');
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
      console.error(`Error auditing ${url} (attempt ${retryCount + 1}):`, error.message);
      
      // Cleanup chrome before retry
      if (chrome) {
        try {
          await chrome.kill();
        } catch (killError) {
          console.error(`Error killing Chrome for ${url}:`, killError.message);
        }
        chrome = null;
      }
      
      // Retry logic for certain types of errors
      const retryableErrors = [
        'TargetCloseError',
        'Protocol error',
        'Session closed',
        'Connection refused',
        'timeout',
        'Navigation timeout',
        'Page crashed'
      ];
      
      const isRetryable = retryableErrors.some(errorType => 
        error.message.includes(errorType) || error.name.includes(errorType)
      );
      
      if (retryCount < this.maxRetries && isRetryable) {
        console.log(`⏳ Retrying ${url} in ${this.retryDelay}ms... (attempt ${retryCount + 2}/${this.maxRetries + 1})`);
        await this._sleep(this.retryDelay);
        return await this.runAudit(url, retryCount + 1);
      }
      
      // Return null scores if all retries failed, don't throw
      console.error(`❌ Final failure for ${url} after ${retryCount + 1} attempts`);
      return {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        pwa: 0,
        error: true,
        errorMessage: error.message.substring(0, 100) // Truncate long error messages
      };
    } finally {
      if (chrome) {
        try {
          await chrome.kill();
        } catch (killError) {
          console.error(`Error in finally block killing Chrome for ${url}:`, killError.message);
        }
      }
    }
  }
}

module.exports = LighthouseRunner;