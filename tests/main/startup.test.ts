import { afterEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipc';

describe('main process startup', () => {
  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('electron-squirrel-startup');
    vi.doUnmock('@main/runtime');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('registers renderer IPC handlers before loading the renderer', async () => {
    const order: string[] = [];
    const readyCallbacks: Array<() => Promise<void>> = [];
    const service = {
      getSession: vi.fn(),
      validateAndStoreApiKey: vi.fn(),
      clearApiKey: vi.fn(),
      getWorkspaces: vi.fn(),
      exportDetailedReport: vi.fn()
    };
    const app = {
      getPath: vi.fn(() => 'D:/Clockify/UserData'),
      on: vi.fn(),
      quit: vi.fn(),
      whenReady: vi.fn(() => ({
        then: (callback: () => Promise<void>) => {
          readyCallbacks.push(callback);
        }
      }))
    };
    const ipcMain = {
      handle: vi.fn((channel: string) => {
        order.push(`handle:${channel}`);
      })
    };

    class BrowserWindowMock {
      public static getAllWindows = vi.fn(() => []);

      public readonly webContents = {
        executeJavaScript: vi.fn().mockResolvedValue({ width: 580, height: 320 })
      };

      public isDestroyed = vi.fn(() => false);
      public loadFile = vi.fn(async () => {
        order.push('load-renderer');
      });
      public loadURL = vi.fn(async () => {
        order.push('load-renderer');
      });
      public setContentSize = vi.fn();
      public setMinimumSize = vi.fn();
      public setTitle = vi.fn();
    }

    vi.doMock('electron', () => ({
      app,
      BrowserWindow: BrowserWindowMock,
      clipboard: { writeText: vi.fn() },
      dialog: {},
      ipcMain,
      shell: {
        openExternal: vi.fn(),
        openPath: vi.fn(),
        showItemInFolder: vi.fn()
      }
    }));
    vi.doMock('electron-squirrel-startup', () => ({ default: false }));
    vi.doMock('@main/runtime', () => ({
      createClockifyExporterService: vi.fn(() => service)
    }));

    await import('../../src/main/index.js');
    expect(readyCallbacks).toHaveLength(1);

    await readyCallbacks[0]();

    expect(order.indexOf(`handle:${IPC_CHANNELS.authGetSession}`)).toBeLessThan(
      order.indexOf('load-renderer')
    );
    expect(order.indexOf(`handle:${IPC_CHANNELS.windowFitContent}`)).toBeLessThan(
      order.indexOf('load-renderer')
    );
  });
});
