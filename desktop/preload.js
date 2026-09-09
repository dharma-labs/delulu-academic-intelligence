// Delulu desktop — preload bridge. Keeps the renderer sandboxed (contextIsolation
// on, nodeIntegration off) while exposing a tiny, safe API.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('deluluDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: process.env.npm_package_version || '1.0.0',
});
