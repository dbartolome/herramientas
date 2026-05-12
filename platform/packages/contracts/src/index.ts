export enum ScanType {
  EMAIL_SECURITY = 'email_security',
  EMAIL_BREACH = 'email_breach',
  SPEED_TEST = 'speed_test',
  GDPR_WEB = 'gdpr_web',
  DOMAIN_SECURITY = 'domain_security',
  WEB_SECURITY = 'web_security',
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface CreateScanRequest {
  type: ScanType;
  asset: string;
  params?: Record<string, unknown>;
}

export interface ScanCreatedEvent {
  scanId: string;
  type: ScanType;
  asset: string;
  params: Record<string, unknown>;
  createdAt: string;
}

export interface ScanResult {
  scanId: string;
  status: ScanStatus;
  score?: number;
  summary: string;
  executive_summary?: string;
  executive_impact?: string;
  action_plan?: string[];
  findings: Array<{
    id: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    evidence: string;
    recommendation: string;
  }>;
  generatedAt: string;
}
