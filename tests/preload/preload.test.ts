import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipc';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
  },
}));

describe('preload bridge', () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    invoke.mockClear();
    vi.resetModules();
  });

  it('exposes the typed Clockify desktop API and forwards invocations to IPC', async () => {
    await import('../../src/preload/index.js');

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, api] = exposeInMainWorld.mock.calls[0] as [string, Record<string, (...args: unknown[]) => unknown>];

    expect(name).toBe('clockifyExporter');

    await api.getSession();
    await api.validateAndStoreApiKey('secret');
    await api.clearApiKey();
    await api.getWorkspaces();
    await api.exportDetailedReport({
      workspaceId: 'ws-1',
      workspaceName: 'Alpha',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'csv',
    });
    await api.openFile('D:/Exports/report.csv');
    await api.openFolder('D:/Exports/report.csv');
    await api.openExternalUrl('https://app.clockify.me/calendar');
    await api.copyText('D:/Exports/report.csv');
    await api.fitWindowToContent();

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.authGetSession);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.authValidateAndStoreApiKey, 'secret');
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.authClearApiKey);
    expect(invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.clockifyGetWorkspaces);
    expect(invoke).toHaveBeenNthCalledWith(
      5,
      IPC_CHANNELS.clockifyExportDetailedReport,
      expect.objectContaining({
        workspaceId: 'ws-1',
        format: 'csv',
      }),
    );
    expect(invoke).toHaveBeenNthCalledWith(6, IPC_CHANNELS.desktopOpenFile, 'D:/Exports/report.csv');
    expect(invoke).toHaveBeenNthCalledWith(7, IPC_CHANNELS.desktopOpenFolder, 'D:/Exports/report.csv');
    expect(invoke).toHaveBeenNthCalledWith(8, IPC_CHANNELS.desktopOpenExternalUrl, 'https://app.clockify.me/calendar');
    expect(invoke).toHaveBeenNthCalledWith(9, IPC_CHANNELS.desktopCopyText, 'D:/Exports/report.csv');
    expect(invoke).toHaveBeenNthCalledWith(10, IPC_CHANNELS.windowFitContent);
  });
});
