import { DateTime } from 'luxon';
import type { ClockifyClient } from '@main/services/clockifyClient';
import type { CredentialStore } from '@main/services/credentialStore';
import {
  buildDefaultExportFileName,
  createCsvBuffer,
  createJsonBuffer,
  createXlsxBuffer,
} from '@main/services/exportService';
import type { PreferencesStore } from '@main/services/preferencesStore';
import type { ExportOverlap, ExportResult } from '@shared/ipc';
import type {
  ClockifyDetailedReportResponse,
  ClockifyDetailedTimeEntry,
  ClockifySession,
  ExportRequest,
  UserPreferences,
  WorkspaceOption,
} from '@shared/types';

export interface FileGateway {
  saveExport(payload: { suggestedFileName: string; format: string; buffer: Buffer }): Promise<string | null>;
}

interface ClockifyExporterServiceDependencies {
  client: Pick<ClockifyClient, 'validateApiKey' | 'getWorkspaces' | 'getDetailedReport'>;
  credentialStore: CredentialStore;
  preferencesStore: PreferencesStore;
  fileGateway: FileGateway;
}

interface ComparableTimeEntry {
  id: string;
  userName: string;
  projectName: string;
  description: string;
  start: DateTime;
  end: DateTime;
}

const OVERLAP_TOLERANCE_SECONDS = 60;

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
      this.dependencies.preferencesStore.read(),
    ]);

    return {
      session,
      workspaces,
      preferences,
    };
  }

  public async exportDetailedReport(request: ExportRequest): Promise<ExportResult | null> {
    const apiKey = await this.requireApiKey();
    const session = await this.getSession();
    const report = await this.dependencies.client.getDetailedReport({
      apiKey,
      workspaceId: request.workspaceId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      userTimeZone: session.userTimeZone ?? 'UTC',
    });
    const overlaps = detectEntryOverlaps(report);

    if (overlaps.length > 0) {
      return {
        kind: 'validation-error',
        message: 'Overlapping time entries were found.',
        fixUrl: 'https://app.clockify.me/calendar',
        overlaps,
      };
    }

    const exportPath = await this.dependencies.fileGateway.saveExport({
      suggestedFileName: buildDefaultExportFileName(
        request.workspaceName,
        request.fromDate,
        request.toDate,
        request.format,
      ),
      format: request.format,
      buffer: this.createBuffer(request.format, report),
    });

    if (!exportPath) {
      return null;
    }

    await this.dependencies.preferencesStore.write({
      lastWorkspaceId: request.workspaceId,
      lastExportFormat: request.format,
    });

    return {
      kind: 'success',
      path: exportPath,
      recordCount: report.timeentries.length,
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

const detectEntryOverlaps = (report: ClockifyDetailedReportResponse): ExportOverlap[] => {
  const entries = report.timeentries
    .map(toComparableEntry)
    .filter((entry): entry is ComparableTimeEntry => entry !== null);
  const entriesByUser = new Map<string, ComparableTimeEntry[]>();

  for (const entry of entries) {
    const userEntries = entriesByUser.get(entry.userName) ?? [];
    userEntries.push(entry);
    entriesByUser.set(entry.userName, userEntries);
  }

  const overlaps: ExportOverlap[] = [];

  for (const [userName, userEntries] of entriesByUser.entries()) {
    const sortedEntries = [...userEntries].sort((left, right) => left.start.toMillis() - right.start.toMillis());

    for (let index = 0; index < sortedEntries.length; index += 1) {
      const current = sortedEntries[index];

      for (let nextIndex = index + 1; nextIndex < sortedEntries.length; nextIndex += 1) {
        const next = sortedEntries[nextIndex];

        if (next.start >= current.end) {
          break;
        }

        const overlapStart = current.start > next.start ? current.start : next.start;
        const overlapEnd = current.end < next.end ? current.end : next.end;
        const overlapSeconds = Math.floor(overlapEnd.diff(overlapStart, 'seconds').seconds);

        if (overlapSeconds <= OVERLAP_TOLERANCE_SECONDS) {
          continue;
        }

        overlaps.push({
          date: overlapStart.toISODate() ?? '',
          userName,
          overlapSeconds,
          first: {
            id: current.id,
            projectName: current.projectName,
            description: current.description,
            start: current.start.toISO() ?? '',
            end: current.end.toISO() ?? '',
          },
          second: {
            id: next.id,
            projectName: next.projectName,
            description: next.description,
            start: next.start.toISO() ?? '',
            end: next.end.toISO() ?? '',
          },
        });
      }
    }
  }

  return overlaps;
};

const toComparableEntry = (entry: ClockifyDetailedTimeEntry): ComparableTimeEntry | null => {
  const start = parseTimeBoundary(entry, 'start');
  const end = parseTimeBoundary(entry, 'end');

  if (!start || !end || end <= start) {
    return null;
  }

  return {
    id: entry.id,
    userName: entry.userName ?? 'Unknown user',
    projectName: entry.projectName ?? '',
    description: entry.description ?? '',
    start,
    end,
  };
};

const parseTimeBoundary = (entry: ClockifyDetailedTimeEntry, boundary: 'start' | 'end'): DateTime | null => {
  const zonedValue = boundary === 'start' ? entry.timeInterval?.zonedStart : entry.timeInterval?.zonedEnd;
  const rawValue = boundary === 'start' ? entry.timeInterval?.start : entry.timeInterval?.end;

  for (const candidate of [zonedValue, rawValue]) {
    if (!candidate) {
      continue;
    }

    const parsed = DateTime.fromISO(candidate, { setZone: true });

    if (parsed.isValid) {
      return parsed;
    }
  }

  return null;
};
