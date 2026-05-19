import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS, registerIpcHandlers } from '@main/ipc';
import type { ExportRequest } from '@shared/types';

describe('registerIpcHandlers', () => {
  it('registers the typed IPC surface and forwards calls to the service', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler);
      })
    };

    const service = {
      getSession: vi.fn().mockResolvedValue({ apiKeyPresent: false }),
      validateAndStoreApiKey: vi.fn().mockResolvedValue({ apiKeyPresent: true, userEmail: 'user@example.com' }),
      clearApiKey: vi.fn().mockResolvedValue({ apiKeyPresent: false }),
      getWorkspaces: vi.fn().mockResolvedValue({ session: { apiKeyPresent: true }, workspaces: [], preferences: {} }),
      exportDetailedReport: vi.fn().mockResolvedValue({ path: 'D:/Exports/report.json', recordCount: 4 })
    };

    registerIpcHandlers({
      ipcMain,
      service
    });

    expect(ipcMain.handle).toHaveBeenCalledTimes(5);
    await expect(handlers.get(IPC_CHANNELS.authGetSession)?.()).resolves.toEqual({ apiKeyPresent: false });
    await expect(handlers.get(IPC_CHANNELS.authValidateAndStoreApiKey)?.({}, 'api-key')).resolves.toEqual({
      apiKeyPresent: true,
      userEmail: 'user@example.com'
    });
    await expect(handlers.get(IPC_CHANNELS.authClearApiKey)?.()).resolves.toEqual({ apiKeyPresent: false });
    await expect(handlers.get(IPC_CHANNELS.clockifyGetWorkspaces)?.()).resolves.toEqual({
      session: { apiKeyPresent: true },
      workspaces: [],
      preferences: {}
    });

    const exportRequest: ExportRequest = {
      workspaceId: 'ws-1',
      workspaceName: 'Alpha',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'json'
    };
    await expect(handlers.get(IPC_CHANNELS.clockifyExportDetailedReport)?.({}, exportRequest)).resolves.toEqual({
      path: 'D:/Exports/report.json',
      recordCount: 4
    });
  });
});
