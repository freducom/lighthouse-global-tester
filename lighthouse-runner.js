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
    let chrome = null;
    
    // Ensure URL has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      chrome = await chromeLauncher.launch({
        chromeFlags: [
          '--headless=new',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
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
      
      let timeoutId;
      let isTimedOut = false;
      
      // Create a more robust timeout mechanism
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          reject(new Error(`Lighthouse audit timeout after ${this.auditTimeout}ms`));
        }, this.auditTimeout);
      });
      
      let runnerResult;
      try {
        // Run lighthouse with timeout
        runnerResult = await Promise.race([
          lighthouse(url, options),
          timeoutPromise
        ]);
        
        // Clear timeout if successful
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (raceError) {
        // Clear timeout on any error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Force kill chrome immediately on timeout to prevent hanging
        if (isTimedOut && chrome) {
          try {
            await chrome.kill();
            chrome = null;
          } catch (killError) {
            console.error(`Error force-killing Chrome after timeout for ${url}:`, killError.message);
          }
        }
        
        throw raceError;
      }
      
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
      
      // Enhanced cleanup with better error handling
      if (chrome) {
        try {
          // Give Chrome a moment to cleanup before killing
          await new Promise(resolve => setTimeout(resolve, 1000));
          await chrome.kill();
        } catch (killError) {
          console.error(`Error killing Chrome for ${url}:`, killError.message);
          
          // Try force kill if normal kill failed
          try {
            process.kill(chrome.pid, 'SIGKILL');
          } catch (forceKillError) {
            console.error(`Error force killing Chrome process ${chrome.pid}:`, forceKillError.message);
          }
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
        'Page crashed',
        'Target closed',
        'WebSocket is not open'
      ];
      
      const isRetryable = retryableErrors.some(errorType => 
        error.message.includes(errorType) || 
        error.name.includes(errorType) || 
        error.constructor.name.includes('TargetCloseError')
      );
      
      if (retryCount < this.maxRetries && isRetryable) {
        console.log(`⏳ Retrying ${url} in ${this.retryDelay}ms... (attempt ${retryCount + 2}/${this.maxRetries + 1})`);
        
        // Add longer delay for TargetCloseError to let Chrome fully cleanup
        const delayTime = error.message.includes('TargetCloseError') || error.message.includes('Target closed') 
          ? this.retryDelay * 2 
          : this.retryDelay;
          
        await this._sleep(delayTime);
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
      // Enhanced cleanup in finally block with process safety
      if (chrome) {
        try {
          // Check if Chrome process is still running before trying to kill
          if (chrome.pid) {
            try {
              process.kill(chrome.pid, 0); // Test if process exists (doesn't kill)
              await chrome.kill(); // Normal kill if process exists
            } catch (processCheckError) {
              // Process already dead, no need to kill
              console.log(`Chrome process ${chrome.pid} already terminated for ${url}`);
            }
          }
        } catch (killError) {
          console.error(`Error in finally block killing Chrome for ${url}:`, killError.message);
          
          // Last resort: try direct process kill
          if (chrome.pid) {
            try {
              process.kill(chrome.pid, 'SIGTERM');
            } catch (finalKillError) {
              // Process might already be dead, ignore
            }
          }
        }
      }
    }
  }
}

module.exports = LighthouseRunner;