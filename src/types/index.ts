export interface HttpResponse {
    status: number;
    statusText: string;
    data: any;
}

export interface DomainTestResult {
    domain: string;
    connectivity: boolean;
    responseTime: number; // in milliseconds
    error?: string; // optional error message
}