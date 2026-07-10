import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFileDialog(): Promise<{ content: string; fileName: string; filePath: string } | null>;
  saveFileDialog(defaultName?: string): Promise<string | null>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, data: string): Promise<void>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  onMenuOpen(callback: () => void): () => void;
  onMenuSave(callback: () => void): () => void;
  onMenuSaveAs(callback: () => void): () => void;
  toggleDevTools(): void;
}

const api: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('dialog:open'),
  saveFileDialog: (defaultName?: string) => ipcRenderer.invoke('dialog:save', defaultName),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeClipboardText: (text: string) => ipcRenderer.invoke('clipboard:write-text', text),

  onMenuOpen: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('menu:open', handler);
    return () => ipcRenderer.removeListener('menu:open', handler);
  },

  onMenuSave: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('menu:save', handler);
    return () => ipcRenderer.removeListener('menu:save', handler);
  },

  onMenuSaveAs: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('menu:save-as', handler);
    return () => ipcRenderer.removeListener('menu:save-as', handler);
  },

  toggleDevTools: () => ipcRenderer.invoke('devtools:toggle'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
