const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFlipbook: () => ipcRenderer.send('open-flipbook'),
  goToLauncher: () => ipcRenderer.send('go-to-launcher'),
  onFlipbookOpened: (callback) => ipcRenderer.on('flipbook-opened', callback),
  downloadVideo: () => ipcRenderer.send('download-video'),
  onSetVideoPath: (callback) => ipcRenderer.on('set-video-path', callback),
  onSetFlipbookPath: (callback) => ipcRenderer.on('set-flipbook-path', callback),
  decryptVideo: (encPath) => ipcRenderer.invoke('decrypt-video', encPath),

}); 