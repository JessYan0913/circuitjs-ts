import { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Path to UI build output
const UI_INDEX = path.resolve(__dirname, '../../ui/dist/index.html');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(UI_INDEX);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('dialog:open', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Circuit Files', extensions: ['circuit', 'txt', 'circ'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const content = await readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  return { content, fileName, filePath };
});

ipcMain.handle('dialog:save', async (_event, defaultName?: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'Circuit Files', extensions: ['circuit', 'txt', 'circ'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return { filePath: result.filePath };
});

ipcMain.handle('file:read', async (_event, filePath: string) => {
  const content = await readFile(filePath, 'utf-8');
  return content;
});

ipcMain.handle('file:write', async (_event, filePath: string, data: string) => {
  await writeFile(filePath, data, 'utf-8');
});

ipcMain.handle('clipboard:read-text', () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard:write-text', (_event, text: string) => {
  clipboard.writeText(text);
});

ipcMain.handle('devtools:toggle', () => {
  mainWindow?.webContents.toggleDevTools();
});

// ── Native Menu ────────────────────────────────────────────────────────────

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-as'),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          role: 'quit',
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About CircuitJS',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About CircuitJS Next',
              message: 'CircuitJS Next',
              detail: 'Electron Desktop App',
            });
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Drag & Drop ────────────────────────────────────────────────────────────

function setupDragAndDrop() {
  if (!mainWindow) return;

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
}

// ── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  setupDragAndDrop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
