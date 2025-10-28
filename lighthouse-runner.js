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
    let chromeKilled = false;
    
    // Normalize URL to base domain only (remove paths, trailing slashes, etc.)
    let normalizedUrl = url;
    
    // First, ensure URL has proper protocol
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Extract just the base domain by parsing the URL and reconstructing with protocol + hostname only
    try {
      const urlObj = new URL(normalizedUrl);
      normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      
      // Log if we've modified the original URL
      if (normalizedUrl !== url && !url.startsWith('http')) {
        // Only log if the original URL had paths (not just protocol addition)
        const originalWithProtocol = url.startsWith('http') ? url : 'https://' + url;
        if (normalizedUrl !== originalWithProtocol) {
          console.log(`🔧 Normalized URL: ${url} → ${normalizedUrl}`);
        }
      }
    } catch (urlError) {
      console.warn(`⚠️ Could not parse URL ${normalizedUrl}, using as-is:`, urlError.message);
    }
    
    // Use the normalized URL for the rest of the function
    url = normalizedUrl;
    
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
          '--disable-ipc-flooding-protection',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain'
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
      
      // Create a more robust timeout mechanism with graceful shutdown
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(async () => {
          isTimedOut = true;
          console.log(`⏰ Timeout reached for ${url}, attempting graceful Chrome shutdown...`);
          
          // Try graceful Chrome shutdown first
          if (chrome && !chromeKilled) {
            try {
              chromeKilled = true;
              await chrome.kill();
              console.log(`✅ Chrome gracefully shut down for ${url}`);
            } catch (killError) {
              console.error(`⚠️ Error during graceful Chrome shutdown for ${url}:`, killError.message);
              
              // Force kill if graceful shutdown fails
              if (chrome.pid) {
                try {
                  process.kill(chrome.pid, 'SIGKILL');
                  console.log(`🔪 Force killed Chrome process ${chrome.pid} for ${url}`);
                } catch (forceKillError) {
                  console.error(`❌ Error force killing Chrome process ${chrome.pid}:`, forceKillError.message);
                }
              }
            }
          }
          
          // Give Chrome time to fully shut down before rejecting
          setTimeout(() => {
            reject(new Error(`Lighthouse audit timeout after ${this.auditTimeout}ms`));
          }, 2000);
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
        
        // Don't kill Chrome here if it was already killed by timeout
        if (!chromeKilled && chrome) {
          try {
            chromeKilled = true;
            await chrome.kill();
            console.log(`🧹 Chrome cleaned up after error for ${url}`);
          } catch (killError) {
            console.error(`⚠️ Error cleaning up Chrome after race error for ${url}:`, killError.message);
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
      
      // Enhanced retry logic for certain types of errors
      const retryableErrors = [
        'TargetCloseError',
        'Protocol error',
        'Session closed',
        'Connection refused',
        'timeout',
        'Navigation timeout',
        'Page crashed',
        'Target closed',
        'WebSocket is not open',
        'net::ERR_',
        'net::',
        'ERR_CONNECTION',
        'ERR_TIMED_OUT',
        'ERR_NETWORK_CHANGED',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT'
      ];
      
      const isRetryable = retryableErrors.some(errorType => 
        error.message.includes(errorType) || 
        error.name.includes(errorType) || 
        error.constructor.name.includes('TargetCloseError') ||
        error.stack?.includes('TargetCloseError')
      );
      
      if (retryCount < this.maxRetries && isRetryable) {
        console.log(`⏳ Retrying ${url} in ${this.retryDelay}ms... (attempt ${retryCount + 2}/${this.maxRetries + 1})`);
        
        // Add progressively longer delays for different error types
        let delayTime = this.retryDelay;
        if (error.message.includes('TargetCloseError') || error.message.includes('Target closed')) {
          delayTime = this.retryDelay * 3; // 9 seconds for target errors
        } else if (error.message.includes('timeout')) {
          delayTime = this.retryDelay * 2; // 6 seconds for timeout errors
        }
        
        // Add extra delay for network-related errors
        if (error.message.includes('ERR_CONNECTION') || error.message.includes('ECONNREFUSED')) {
          delayTime = this.retryDelay * 4; // 12 seconds for connection errors
        }
          
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
      if (chrome && !chromeKilled) {
        try {
          // Check if Chrome process is still running before trying to kill
          if (chrome.pid) {
            try {
              process.kill(chrome.pid, 0); // Test if process exists (doesn't kill)
              chromeKilled = true;
              await chrome.kill(); // Normal kill if process exists
              console.log(`🧹 Chrome cleaned up in finally block for ${url}`);
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
              console.log(`🔪 Final SIGTERM sent to Chrome process ${chrome.pid} for ${url}`);
            } catch (finalKillError) {
              // Process might already be dead, ignore
              console.log(`Chrome process ${chrome.pid} was already dead for ${url}`);
            }
          }
        }
      }
      
      // Add a small delay to ensure Chrome fully shuts down before next audit
      if (retryCount === 0) { // Only add delay on first attempt, not retries
        await this._sleep(1000);
      }
    }
  }
}

module.exports = LighthouseRunner;