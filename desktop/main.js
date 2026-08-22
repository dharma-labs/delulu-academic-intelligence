// Delulu — Academic Intelligence (Electron desktop shell)
// Boots the bundled Next.js standalone server and loads it in a native window.

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || 3210);
const HOST = '127.0.0.1';

let serverProcess = null;
let mainWindow = null;
let logStream = null;

function startServer() {
  const serverDir = path.join(__dirname, 'server');
  const serverEntry = path.join(serverDir, 'server.js');

  if (!fs.existsSync(serverEntry)) {
    console.error('Missing bundled server.js at', serverEntry);
    return;
  }

  // Run the Node server with Electron's embedded Node runtime.
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: HOST,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const logDir = app.getPath('userData');
  logStream = fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
  serverProcess.stdout.pipe(logStream);
  serverProcess.stderr.pipe(logStream);

  serverProcess.on('error', (err) => {
    try { logStream.write(`[electron] server spawn error: ${err.message}\n`); } catch {}
  });
  serverProcess.on('exit', (code) => {
    serverProcess = null;
  });
}

function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => retry());
      req.setTimeout(1500, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(attempt, 400);
    };
    attempt();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 820,
    minHeight: 600,
    title: 'Delulu — Academic Intelligence',
    autoHideMenuBar: true,
    backgroundColor: '#0B1120',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startServer();
  const ok = await waitForServer(`http://${HOST}:${PORT}`);
  if (!ok) console.error('Server did not become ready in time.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch {}
  }
});
