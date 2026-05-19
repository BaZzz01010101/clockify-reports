import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockifyApiError } from '@main/services/clockifyClient';
import { ClockifyExporterService } from '@main/services/clockifyExporterService';
import type { ClockifyDetailedReportResponse, ClockifySession, ExportRequest, WorkspaceOption } from '@shared/types';

describe('ClockifyExporterService', () => {
  const validateApiKey = vi.fn<(apiKey: string) => Promise<ClockifySession>>();
  const getWorkspaces = vi.fn<(apiKey: string) => Promise<WorkspaceOption[]>>();
  const getDetailedReport =
    vi.fn<
      (query: {
        apiKey: string;
        workspaceId: string;
        fromDate: string;
        toDate: string;
        userTimeZone: string;
      }) => Promise<ClockifyDetailedReportResponse>
    >();
  const getApiKey = vi.fn<() => Promise<string | null>>();
  const saveApiKey = vi.fn<(apiKey: string) => Promise<void>>();
  const clearApiKey = vi.fn<() => Promise<void>>();
  const readPreferences = vi.fn<() => Promise<Record<string, string>>>();
  const writePreferences = vi.fn<(next: Record<string, string>) => Promise<void>>();
  const saveExport =
    vi.fn<(payload: { suggestedFileName: string; format: string; buffer: Buffer }) => Promise<string | null>>();

  const reportPayload: ClockifyDetailedReportResponse = {
    totals: [{ totalTime: 1800 }],
    timeentries: [
      {
        id: 'entry-1',
        userName: 'Ada Lovelace',
        clientName: 'CAKE',
        projectName: 'Clockify',
        taskName: 'Research',
        description: 'Inspect export flow',
        tags: [{ name: 'Export' }],
        billable: true,
        timeInterval: {
          start: '2026-05-04T08:00:00.000Z',
          end: '2026-05-04T08:30:00.000Z',
          duration: 'PT30M',
        },
      },
    ],
  };

  beforeEach(() => {
    validateApiKey.mockReset();
    getWorkspaces.mockReset();
    getDetailedReport.mockReset();
    getApiKey.mockReset();
    saveApiKey.mockReset();
    clearApiKey.mockReset();
    readPreferences.mockReset();
    writePreferences.mockReset();
    saveExport.mockReset();
    readPreferences.mockResolvedValue({});
  });

  const createService = () =>
    new ClockifyExporterService({
      client: {
        validateApiKey,
        getWorkspaces,
        getDetailedReport,
      },
      credentialStore: {
        getApiKey,
        saveApiKey,
        clearApiKey,
      },
      preferencesStore: {
        read: readPreferences,
        write: writePreferences,
      },
      fileGateway: {
        saveExport,
      },
    });

  it('validates and persists a new API key only after validation succeeds', async () => {
    validateApiKey.mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid',
    });

    const service = createService();

    await expect(service.validateAndStoreApiKey('good-key')).resolves.toEqual({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid',
    });
    expect(saveApiKey).toHaveBeenCalledWith('good-key');
  });

  it('does not persist invalid API keys', async () => {
    validateApiKey.mockRejectedValue(new ClockifyApiError('Invalid Clockify API key', 'INVALID_API_KEY', false, 401));

    const service = createService();

    await expect(service.validateAndStoreApiKey('bad-key')).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    });
    expect(saveApiKey).not.toHaveBeenCalled();
  });

  it('returns stored session state and workspace options', async () => {
    getApiKey.mockResolvedValue('stored-key');
    validateApiKey.mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'UTC',
    });
    getWorkspaces.mockResolvedValue([{ id: 'ws-1', name: 'Alpha' }]);
    readPreferences.mockResolvedValue({
      lastWorkspaceId: 'ws-1',
      lastExportFormat: 'json',
    });

    const service = createService();

    await expect(service.getWorkspaces()).resolves.toEqual({
      session: {
        apiKeyPresent: true,
        userEmail: 'user@example.com',
        userTimeZone: 'UTC',
      },
      workspaces: [{ id: 'ws-1', name: 'Alpha' }],
      preferences: {
        lastWorkspaceId: 'ws-1',
        lastExportFormat: 'json',
      },
    });
  });

  it('exports a detailed report using the stored API key and persists last selections', async () => {
    getApiKey.mockResolvedValue('stored-key');
    validateApiKey.mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid',
    });
    getDetailedReport.mockResolvedValue(reportPayload);
    saveExport.mockResolvedValue('D:/Exports/clockify-detailed-alpha-2026-05-04-2026-05-10.csv');

    const request: ExportRequest = {
      workspaceId: 'ws-1',
      workspaceName: 'Alpha',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'csv',
    };

    const service = createService();

    await expect(service.exportDetailedReport(request)).resolves.toEqual({
      kind: 'success',
      path: 'D:/Exports/clockify-detailed-alpha-2026-05-04-2026-05-10.csv',
      recordCount: 1,
    });
    expect(getDetailedReport).toHaveBeenCalledWith({
      apiKey: 'stored-key',
      workspaceId: 'ws-1',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      userTimeZone: 'Europe/Madrid',
    });
    expect(saveExport).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedFileName: 'clockify-detailed-alpha-2026-05-04-2026-05-10.csv',
        format: 'csv',
      }),
    );
    expect(writePreferences).toHaveBeenCalledWith({
      lastWorkspaceId: 'ws-1',
      lastExportFormat: 'csv',
    });
  });

  it('returns a validation error when time entries overlap by more than one minute', async () => {
    getApiKey.mockResolvedValue('stored-key');
    validateApiKey.mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid',
    });
    getDetailedReport.mockResolvedValue({
      totals: [{ totalTime: 7200 }],
      timeentries: [
        {
          id: 'entry-1',
          userName: 'Ada Lovelace',
          clientName: 'CAKE',
          projectName: 'Clockify',
          taskName: 'Research',
          description: 'Morning analysis',
          tags: [],
          billable: true,
          timeInterval: {
            start: '2026-05-04T08:00:00.000Z',
            end: '2026-05-04T10:00:00.000Z',
            duration: 'PT2H',
          },
        },
        {
          id: 'entry-2',
          userName: 'Ada Lovelace',
          clientName: 'CAKE',
          projectName: 'Clockify',
          taskName: 'Research',
          description: 'Overlapping review',
          tags: [],
          billable: true,
          timeInterval: {
            start: '2026-05-04T09:30:00.000Z',
            end: '2026-05-04T10:30:00.000Z',
            duration: 'PT1H',
          },
        },
      ],
    });

    const request: ExportRequest = {
      workspaceId: 'ws-1',
      workspaceName: 'Alpha',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'csv',
    };

    const service = createService();

    await expect(service.exportDetailedReport(request)).resolves.toMatchObject({
      kind: 'validation-error',
      fixUrl: 'https://app.clockify.me/calendar',
      overlaps: [
        {
          date: '2026-05-04',
          userName: 'Ada Lovelace',
          first: {
            id: 'entry-1',
          },
          second: {
            id: 'entry-2',
          },
        },
      ],
    });
    expect(saveExport).not.toHaveBeenCalled();
    expect(writePreferences).not.toHaveBeenCalled();
  });

  it('returns apiKeyPresent false when no credentials are stored', async () => {
    getApiKey.mockResolvedValue(null);

    const service = createService();

    await expect(service.getSession()).resolves.toEqual({
      apiKeyPresent: false,
    });
  });
});
