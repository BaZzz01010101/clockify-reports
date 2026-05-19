import type { IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';
import type { ClockifyExporterService } from '@main/services/clockifyExporterService';

export { IPC_CHANNELS } from '@shared/ipc';

export const registerIpcHandlers = ({
  ipcMain,
  service
}: {
  ipcMain: Pick<IpcMain, 'handle'>;
  service: Pick<
    ClockifyExporterService,
    'getSession' | 'validateAndStoreApiKey' | 'clearApiKey' | 'getWorkspaces' | 'exportDetailedReport'
  >;
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
};
