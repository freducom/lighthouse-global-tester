import { domains } from '../config/domains';
import { HttpClient } from '../utils/httpClient';
import { log } from '../utils/logger';
import { DomainTestResult } from '../types';

export const testPerformance = async (): Promise<DomainTestResult[]> => {
    const httpClient = new HttpClient();
    const results: DomainTestResult[] = [];

    for (const domain of domains) {
        const startTime = performance.now();
        try {
            await httpClient.get(`https://${domain}`);
            const endTime = performance.now();
            results.push({
                domain,
                responseTime: endTime - startTime,
                status: 'success',
            });
        } catch (error) {
            const endTime = performance.now();
            results.push({
                domain,
                responseTime: endTime - startTime,
                status: 'failure',
                error: error.message,
            });
        }
    }

    log('Performance test results:', results);
    return results;
};