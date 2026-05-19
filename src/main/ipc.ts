import type { IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import type { ClockifyExporterService } from '@main/services/clockifyExporterService';

export { IPC_CHANNELS } from '@shared/ipc';

export const registerIpcHandlers = ({
  ipcMain,
  service,
  desktop,
  window
}: {
  ipcMain: Pick<IpcMain, 'handle'>;
  service: Pick<
    ClockifyExporterService,
    'getSession' | 'validateAndStoreApiKey' | 'clearApiKey' | 'getWorkspaces' | 'exportDetailedReport'
  >;
  desktop: {
    openPath(path: string): Promise<string>;
    showItemInFolder(path: string): void;
    writeText(text: string): void;
  };
  window: {
    fitContent(): Promise<void>;
  };
}): void => {
  ipcMain.handle(IPC_CHANNELS.authGetSession, () => service.getSession());
  ipcMain.handle(IPC_CHANNELS.authValidateAndStoreApiKey, (_, apiKey: string) =>
    service.validateAndStoreApiKey(apiKey)
  );
  ipcMain.handle(IPC_CHANNELS.authClearApiKey, () => service.clearApiKey());
  ipcMain.handle(IPC_CHANNELS.clockifyGetWorkspaces, () => service.getWorkspaces());
  ipcMain.handle(IPC_CHANNELS.clockifyExportDetailedReport, (_, request) =>
    service.exportDetailedReport(request)
  );
  ipcMain.handle(IPC_CHANNELS.desktopOpenFile, async (_, targetPath: string) => {
    const error = await desktop.openPath(targetPath);

    if (error) {
      throw new Error(error);
    }
  });
  ipcMain.handle(IPC_CHANNELS.desktopOpenFolder, (_, targetPath: string) =>
    desktop.showItemInFolder(targetPath)
  );
  ipcMain.handle(IPC_CHANNELS.desktopCopyText, (_, text: string) => desktop.writeText(text));
  ipcMain.handle(IPC_CHANNELS.windowFitContent, () => window.fitContent());
};
