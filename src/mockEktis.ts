import voenDatabase from './data/voen.json';
import { EktisLogEntry } from './types';

export interface VerifyVoenResult {
  valid: boolean;
  legalName?: string;
  registeredRegion?: string;
  status?: string;
  director?: string;
  message?: string;
}

export class MockEktisClient {
  private logs: EktisLogEntry[] = [];
  private listeners: Array<(log: EktisLogEntry) => void> = [];

  constructor() {
    // Initialize with some seed logs
    this.logs = [
      {
        id: 'ekt-log-init-1',
        direction: 'GEDEN',
        endpoint: '/competitions',
        requestBody: { competitionNumber: 'II-2026', parcelCodes: ['FZL-002', 'CBR-009', 'ZNG-007', 'QBD-002', 'AGD-011', 'KLB-001', 'LCN-004'] },
        responseBody: { ektisReference: 'EKTIS-C-2026-0002', received: true },
        httpStatus: 200,
        correlationId: 'c-init-8871',
        success: true,
        at: '2026-05-15T10:00:00Z'
      },
      {
        id: 'ekt-log-init-2',
        direction: 'GEDEN',
        endpoint: '/competitions',
        requestBody: { competitionNumber: 'III-2026', parcelCodes: ['FZL-014', 'FZL-008', 'CBR-003', 'CBR-015', 'ZNG-012', 'QBD-008', 'AGD-005', 'AGD-024', 'KLB-006', 'LCN-010'] },
        responseBody: { ektisReference: 'EKTIS-C-2026-0003', received: true },
        httpStatus: 200,
        correlationId: 'c-init-8872',
        success: true,
        at: '2026-09-20T14:30:00Z'
      }
    ];
  }

  public getLogs(): EktisLogEntry[] {
    return [...this.logs];
  }

  public subscribe(cb: (log: EktisLogEntry) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private addLog(entry: Omit<EktisLogEntry, 'id' | 'at'>): EktisLogEntry {
    const fullEntry: EktisLogEntry = {
      ...entry,
      id: 'ekt-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      at: new Date().toISOString()
    };
    this.logs.unshift(fullEntry);
    this.listeners.forEach(cb => cb(fullEntry));
    return fullEntry;
  }

  private async sleep(ms = 200): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async verifyEntrepreneur(voen: string): Promise<VerifyVoenResult> {
    await this.sleep(220);
    const correlationId = 'ekt-corr-' + Math.random().toString(36).substring(2, 9);
    const found = voenDatabase.find(v => v.voen === voen.trim());

    if (found) {
      const response = {
        valid: true,
        legalName: found.legalName,
        registeredRegion: found.registeredRegion,
        status: found.status,
        director: found.director
      };
      this.addLog({
        direction: 'GEDEN',
        endpoint: '/entrepreneurs/verify',
        requestBody: { voen },
        responseBody: response,
        httpStatus: 200,
        correlationId,
        success: true
      });
      return response;
    } else {
      const response = {
        valid: false,
        message: 'VÖEN EKTİS-də tapılmadı'
      };
      this.addLog({
        direction: 'GEDEN',
        endpoint: '/entrepreneurs/verify',
        requestBody: { voen },
        responseBody: response,
        httpStatus: 404,
        correlationId,
        success: false
      });
      return response;
    }
  }

  public async sendCompetition(competitionNumber: string, parcelCodes: string[], deadline: string): Promise<{ ektisReference: string; received: boolean }> {
    await this.sleep(250);
    const correlationId = 'ekt-corr-' + Math.random().toString(36).substring(2, 9);
    const ref = `EKTIS-C-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const req = { competitionNumber, parcelCodes, deadline };
    const res = { ektisReference: ref, received: true };

    this.addLog({
      direction: 'GEDEN',
      endpoint: '/competitions',
      requestBody: req,
      responseBody: res,
      httpStatus: 200,
      correlationId,
      success: true
    });

    return res;
  }

  public async sendApplication(
    applicationNumber: string,
    parcelCode: string,
    applicantVoen: string,
    intendedCrop: string,
    plannedInvestmentAzn: number
  ): Promise<{ ektisReference: string; received: boolean }> {
    await this.sleep(280);
    const correlationId = 'ekt-corr-' + Math.random().toString(36).substring(2, 9);
    const ref = `EKTIS-A-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const req = { applicationNumber, parcelCode, applicantVoen, intendedCrop, plannedInvestmentAzn };
    const res = { ektisReference: ref, received: true };

    this.addLog({
      direction: 'GEDEN',
      endpoint: '/applications',
      requestBody: req,
      responseBody: res,
      httpStatus: 200,
      correlationId,
      success: true
    });

    return res;
  }

  public async sendDecision(
    applicationNumber: string,
    outcome: string,
    decidedAt: string
  ): Promise<{ acknowledged: boolean }> {
    await this.sleep(200);
    const correlationId = 'ekt-corr-' + Math.random().toString(36).substring(2, 9);
    const req = { applicationNumber, outcome, decidedAt };
    const res = { acknowledged: true };

    this.addLog({
      direction: 'GEDEN',
      endpoint: '/decisions',
      requestBody: req,
      responseBody: res,
      httpStatus: 200,
      correlationId,
      success: true
    });

    return res;
  }

  public async retryLog(logId: string): Promise<boolean> {
    const entry = this.logs.find(l => l.id === logId);
    if (!entry) return false;
    await this.sleep(300);
    entry.success = true;
    entry.httpStatus = 200;
    entry.at = new Date().toISOString();
    this.listeners.forEach(cb => cb(entry));
    return true;
  }
}

export const mockEktis = new MockEktisClient();
