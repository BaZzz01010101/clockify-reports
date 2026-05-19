import type {
  ClockifyDetailedReportResponse,
  ClockifySession,
  ExportRequest,
  UserPreferences,
  WorkspaceOption
} from '@shared/types';
import type { ClockifyClient } from '@main/services/clockifyClient';
import type { CredentialStore } from '@main/services/credentialStore';
import {
  buildDefaultExportFileName,
  createCsvBuffer,
  createJsonBuffer,
  createXlsxBuffer
} from '@main/services/exportService';
import type { PreferencesStore } from '@main/services/preferencesStore';

export interface FileGateway {
  saveExport(payload: {
    suggestedFileName: string;
    format: string;
    buffer: Buffer;
  }): Promise<string | null>;
}

interface ClockifyExporterServiceDependencies {
  client: Pick<ClockifyClient, 'validateApiKey' | 'getWorkspaces' | 'getDetailedReport'>;
  credentialStore: CredentialStore;
  preferencesStore: PreferencesStore;
  fileGateway: FileGateway;
}

export class ClockifyExporterService {
  private cachedSession: ClockifySession | null = null;

  public constructor(private readonly dependencies: ClockifyExporterServiceDependencies) {}

  public async getSession(): Promise<ClockifySession> {
    if (this.cachedSession) {
      return this.cachedSession;
    }

    const apiKey = await this.dependencies.credentialStore.getApiKey();
    if (!apiKey) {
      return { apiKeyPresent: false };
    }

    const session = await this.dependencies.client.validateApiKey(apiKey);
    this.cachedSession = session;

    return session;
  }

  public async validateAndStoreApiKey(apiKey: string): Promise<ClockifySession> {
    const session = await this.dependencies.client.validateApiKey(apiKey);

    await this.dependencies.credentialStore.saveApiKey(apiKey);
    this.cachedSession = session;

    return session;
  }

  public async clearApiKey(): Promise<ClockifySession> {
    await this.dependencies.credentialStore.clearApiKey();
    this.cachedSession = null;

    return { apiKeyPresent: false };
  }

  public async getWorkspaces(): Promise<{
    session: ClockifySession;
    workspaces: WorkspaceOption[];
    preferences: UserPreferences;
  }> {
    const apiKey = await this.requireApiKey();
    const session = await this.getSession();
    const [workspaces, preferences] = await Promise.all([
      this.dependencies.client.getWorkspaces(apiKey),
      this.dependencies.preferencesStore.read()
    ]);

    return {
      session,
      workspaces,
      preferences
    };
  }

  public async exportDetailedReport(
    request: ExportRequest
  ): Promise<{ path: string; recordCount: number } | null> {
    const apiKey = await this.requireApiKey();
    const session = await this.getSession();
    const report = await this.dependencies.client.getDetailedReport({
      apiKey,
      workspaceId: request.workspaceId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      userTimeZone: session.userTimeZone ?? 'UTC'
    });
    const exportPath = await this.dependencies.fileGateway.saveExport({
      suggestedFileName: buildDefaultExportFileName(
        request.workspaceName,
        request.fromDate,
        request.toDate,
        request.format
      ),
      format: request.format,
      buffer: this.createBuffer(request.format, report)
    });

    if (!exportPath) {
      return null;
    }

    await this.dependencies.preferencesStore.write({
      lastWorkspaceId: request.workspaceId,
      lastExportFormat: request.format
    });

    return {
      path: exportPath,
      recordCount: report.timeentries.length
    };
  }

  private async requireApiKey(): Promise<string> {
    const apiKey = await this.dependencies.credentialStore.getApiKey();
    if (!apiKey) {
      throw new Error('No Clockify API key configured');
    }

    return apiKey;
  }

  private createBuffer(format: ExportRequest['format'], report: ClockifyDetailedReportResponse): Buffer {
    switch (format) {
      case 'json':
        return createJsonBuffer(report);
      case 'csv':
        return createCsvBuffer(report);
      case 'xlsx':
        return createXlsxBuffer(report);
    }
  }
}
