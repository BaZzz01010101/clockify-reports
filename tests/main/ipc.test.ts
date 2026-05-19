import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS, registerIpcHandlers } from '@main/ipc';
import type { ExportRequest } from '@shared/types';

describe('registerIpcHandlers', () => {
  it('registers the typed IPC surface and forwards calls to the service', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler);
      }),
    };

    const service = {
      getSession: vi.fn().mockResolvedValue({ apiKeyPresent: false }),
      validateAndStoreApiKey: vi.fn().mockResolvedValue({ apiKeyPresent: true, userEmail: 'user@example.com' }),
      clearApiKey: vi.fn().mockResolvedValue({ apiKeyPresent: false }),
      getWorkspaces: vi.fn().mockResolvedValue({ session: { apiKeyPresent: true }, workspaces: [], preferences: {} }),
      exportDetailedReport: vi
        .fn()
        .mockResolvedValue({ kind: 'success', path: 'D:/Exports/report.json', recordCount: 4 }),
    };
    const desktop = {
      openPath: vi.fn().mockResolvedValue(''),
      showItemInFolder: vi.fn(),
      openExternal: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn(),
    };
    const window = {
      fitContent: vi.fn().mockResolvedValue(undefined),
    };

    registerIpcHandlers({
      ipcMain,
      service,
      desktop,
      window,
    });

    expect(ipcMain.handle).toHaveBeenCalledTimes(10);
    await expect(handlers.get(IPC_CHANNELS.authGetSession)?.()).resolves.toEqual({ apiKeyPresent: false });
    await expect(handlers.get(IPC_CHANNELS.authValidateAndStoreApiKey)?.({}, 'api-key')).resolves.toEqual({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
    });
    await expect(handlers.get(IPC_CHANNELS.authClearApiKey)?.()).resolves.toEqual({ apiKeyPresent: false });
    await expect(handlers.get(IPC_CHANNELS.clockifyGetWorkspaces)?.()).resolves.toEqual({
      session: { apiKeyPresent: true },
      workspaces: [],
      preferences: {},
    });

    const exportRequest: ExportRequest = {
      workspaceId: 'ws-1',
      workspaceName: 'Alpha',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'json',
    };
    await expect(handlers.get(IPC_CHANNELS.clockifyExportDetailedReport)?.({}, exportRequest)).resolves.toEqual({
      kind: 'success',
      path: 'D:/Exports/report.json',
      recordCount: 4,
    });
    await expect(handlers.get(IPC_CHANNELS.desktopOpenFile)?.({}, 'D:/Exports/report.json')).resolves.toBeUndefined();
    expect(handlers.get(IPC_CHANNELS.desktopOpenFolder)?.({}, 'D:/Exports/report.json')).toBeUndefined();
    await expect(
      handlers.get(IPC_CHANNELS.desktopOpenExternalUrl)?.({}, 'https://app.clockify.me/calendar'),
    ).resolves.toBeUndefined();
    expect(handlers.get(IPC_CHANNELS.desktopCopyText)?.({}, 'D:/Exports/report.json')).toBeUndefined();
    await expect(handlers.get(IPC_CHANNELS.windowFitContent)?.()).resolves.toBeUndefined();
    expect(desktop.openPath).toHaveBeenCalledWith('D:/Exports/report.json');
    expect(desktop.showItemInFolder).toHaveBeenCalledWith('D:/Exports/report.json');
    expect(desktop.openExternal).toHaveBeenCalledWith('https://app.clockify.me/calendar');
    expect(desktop.writeText).toHaveBeenCalledWith('D:/Exports/report.json');
    expect(window.fitContent).toHaveBeenCalled();
  });
});
