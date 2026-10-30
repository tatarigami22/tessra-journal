const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edge', {
  load: () => ipcRenderer.invoke('data:load'),
  save: json => ipcRenderer.invoke('data:save', json),
  saveImage: (id, dataUrl) => ipcRenderer.invoke('img:save', id, dataUrl),
  readImage: name => ipcRenderer.invoke('img:read', name),
  deleteImage: name => ipcRenderer.invoke('img:delete', name),
  info: () => ipcRenderer.invoke('app:info'),
  openDataFolder: () => ipcRenderer.invoke('app:openData'),
  saveAs: (name, content) => ipcRenderer.invoke('file:saveAs', name, content),
  saveBinary: (name, b64) => ipcRenderer.invoke('file:saveBinary', name, b64),
  copyImage: dataUrl => ipcRenderer.invoke('clip:image', dataUrl),
  shareFile: (name, b64) => ipcRenderer.invoke('share:file', name, b64),
  savePdf: (name, html) => ipcRenderer.invoke('pdf:save', name, html),
  platform: process.platform,
  checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  openUrl: url => ipcRenderer.invoke('app:openUrl', url),
  trayUpdate: p => ipcRenderer.invoke('tray:update', p),
  onTrayNewTrade: fn => ipcRenderer.on('tray:newTrade', () => fn())
});
