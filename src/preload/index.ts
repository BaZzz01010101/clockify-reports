import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type ClockifyDesktopApi } from '@shared/ipc';

const api: ClockifyDesktopApi = {
  getSession: () => ipcRenderer.invoke(IPC_CHANNELS.authGetSession),
  validateAndStoreApiKey: (apiKey) =>
    ipcRenderer.invoke(IPC_CHANNELS.authValidateAndStoreApiKey, apiKey),
  clearApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.authClearApiKey),
  getWorkspaces: () => ipcRenderer.invoke(IPC_CHANNELS.clockifyGetWorkspaces),
  exportDetailedReport: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.clockifyExportDetailedReport, request),
  openFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.desktopOpenFile, path),
  openFolder: (path) => ipcRenderer.invoke(IPC_CHANNELS.desktopOpenFolder, path),
  copyText: (text) => ipcRenderer.invoke(IPC_CHANNELS.desktopCopyText, text),
  fitWindowToContent: () => ipcRenderer.invoke(IPC_CHANNELS.windowFitContent)
};

contextBridge.exposeInMainWorld('clockifyExporter', api);
