import path from 'node:path';
import { spawn } from 'node:child_process';
import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';
import { registerIpcHandlers } from '@main/ipc';
import { createClockifyExporterService } from '@main/runtime';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

if (handleSquirrelStartupEvent()) {
  app.quit();
}

function handleSquirrelStartupEvent(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  const command = process.argv[1];
  const target = path.basename(process.execPath);
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  const runUpdate = (args: string[]): void => {
    spawn(updateExe, args, {
      detached: true,
    }).on('close', () => app.quit());
  };

  if (command === '--squirrel-install' || command === '--squirrel-updated') {
    runUpdate([`--createShortcut=${target}`]);
    return true;
  }

  if (command === '--squirrel-uninstall') {
    runUpdate([`--removeShortcut=${target}`]);
    return true;
  }

  if (command === '--squirrel-obsolete') {
    return true;
  }

  return false;
}

const MIN_CONTENT_WIDTH = 580;
const MIN_CONTENT_HEIGHT = 320;

const fitWindowToContent = async (mainWindow: BrowserWindow): Promise<void> => {
  if (mainWindow.isDestroyed()) {
    return;
  }

  const contentSize = await mainWindow.webContents.executeJavaScript(
    `Promise.resolve().then(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const body = document.body;
      const root = document.getElementById('root');
      const shell = document.querySelector('.app-shell');
      const heightCandidates = [
        body?.scrollHeight ?? 0,
        root?.getBoundingClientRect().height ?? 0,
        shell?.getBoundingClientRect().height ?? 0
      ];
      const widthCandidates = [
        body?.scrollWidth ?? 0,
        root?.getBoundingClientRect().width ?? 0,
        shell?.getBoundingClientRect().width ?? 0
      ];

      return {
        width: Math.ceil(Math.max(...widthCandidates)),
        height: Math.ceil(Math.max(...heightCandidates))
      };
    })`,
    true,
  );

  const nextWidth = Math.max(Number(contentSize?.width) || MIN_CONTENT_WIDTH, MIN_CONTENT_WIDTH);
  const nextHeight = Math.max(Number(contentSize?.height) || MIN_CONTENT_HEIGHT, MIN_CONTENT_HEIGHT);

  mainWindow.setContentSize(nextWidth, nextHeight);
  mainWindow.setMinimumSize(nextWidth, nextHeight);
};

const createMainWindow = (): BrowserWindow =>
  new BrowserWindow({
    useContentSize: true,
    width: MIN_CONTENT_WIDTH,
    height: MIN_CONTENT_HEIGHT,
    minWidth: MIN_CONTENT_WIDTH,
    minHeight: MIN_CONTENT_HEIGHT,
    autoHideMenuBar: true,
    maximizable: false,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

const loadMainWindow = async (mainWindow: BrowserWindow): Promise<void> => {
  const rendererName =
    typeof MAIN_WINDOW_VITE_NAME === 'undefined' || !MAIN_WINDOW_VITE_NAME ? 'main_window' : MAIN_WINDOW_VITE_NAME;

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, `../renderer/${rendererName}/index.html`));
  }
  await fitWindowToContent(mainWindow);
  mainWindow.setTitle('Clockify Reports');
};

app.whenReady().then(async () => {
  let mainWindow = createMainWindow();

  registerIpcHandlers({
    ipcMain,
    desktop: {
      openPath: (targetPath) => shell.openPath(targetPath),
      showItemInFolder: (targetPath) => shell.showItemInFolder(targetPath),
      openExternal: (url) => shell.openExternal(url),
      writeText: (text) => clipboard.writeText(text),
    },
    window: {
      fitContent: () => fitWindowToContent(mainWindow),
    },
    service: createClockifyExporterService({
      userDataPath: app.getPath('userData'),
      dialog,
    }),
  });

  await loadMainWindow(mainWindow);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      await loadMainWindow(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
