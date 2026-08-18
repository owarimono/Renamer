const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  startWatch: () => ipcRenderer.invoke('start-watch'),
  stopWatch: () => ipcRenderer.invoke('stop-watch'),
  resetCounter: () => ipcRenderer.invoke('reset-counter'),
  previewSeq: (n) => ipcRenderer.invoke('preview-seq', n),
  onLog: (cb) => ipcRenderer.on('log', (_e, m) => cb(m)),
  onCounter: (cb) => ipcRenderer.on('counter', (_e, n) => cb(n)),
  winMin: () => ipcRenderer.send('win-min'),
  winMax: () => ipcRenderer.send('win-max'),
  winClose: () => ipcRenderer.send('win-close'),
});
