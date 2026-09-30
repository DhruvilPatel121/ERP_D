const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // Open external URLs in default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Copy image to clipboard using Electron's native clipboard
  copyImageToClipboard: (dataUrl) => ipcRenderer.invoke('copy-image-to-clipboard', dataUrl),
});
