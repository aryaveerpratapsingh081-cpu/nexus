const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, allowlisted desktop APIs to renderer via contextBridge
contextBridge.exposeInMainWorld('nexusDesktop', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, state) => callback(state));
  }
});

