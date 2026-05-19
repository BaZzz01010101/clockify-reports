import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from '@main/ipc';
import { createClockifyExporterService } from '@main/runtime';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

if (started) {
  app.quit();
}

const createMainWindow = async (): Promise<void> => {
  const rendererName =
    typeof MAIN_WINDOW_VITE_NAME === 'undefined' || !MAIN_WINDOW_VITE_NAME
      ? 'main_window'
      : MAIN_WINDOW_VITE_NAME;
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 760,
    minWidth: 760,
    minHeight: 620,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, `../renderer/${rendererName}/index.html`));
  }
  mainWindow.setTitle('Clockify Reports');
};

app.whenReady().then(async () => {
  registerIpcHandlers({
    ipcMain,
    service: createClockifyExporterService({
      userDataPath: app.getPath('userData'),
      dialog
    })
  });

  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
