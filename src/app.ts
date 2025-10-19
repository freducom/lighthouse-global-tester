import { testConnectivity } from './tests/connectivity.test';
import { testPerformance } from './tests/performance.test';
import { domains } from './config/domains';
import { log } from './utils/logger';

const initApp = async () => {
    log('Initializing web testing application...');
    
    log('Testing connectivity for domains...');
    await testConnectivity(domains);
    
    log('Testing performance for domains...');
    await testPerformance(domains);
    
    log('Testing completed.');
};

initApp().catch(error => {
    log(`An error occurred: ${error.message}`);
});