import { domains } from '../config/domains';
import { HttpClient } from '../utils/httpClient';
import { log } from '../utils/logger';

export const testConnectivity = async () => {
    const httpClient = new HttpClient();
    const results = [];

    for (const domain of domains) {
        try {
            const response = await httpClient.get(`https://${domain}`);
            results.push({ domain, status: response.status, reachable: true });
            log(`Successfully reached ${domain} with status ${response.status}`);
        } catch (error) {
            results.push({ domain, status: error.message, reachable: false });
            log(`Failed to reach ${domain}: ${error.message}`);
        }
    }

    return results;
};