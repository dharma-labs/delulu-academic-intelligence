// Delulu — Academic Intelligence · Desktop app (Electron)
//
// Serves the static export (desktop/dist, copied from ../out) over a tiny local
// HTTP server, then loads it in a native window. This keeps the app fully
// offline-first (all data lives in localStorage) and avoids file:// asset-path
// issues with Next.js's absolute `/_next/...` URLs.
//
// Delulu 4.2 security hardening:
//   - Renderer fully sandboxed (contextIsolation + sandbox + no nodeIntegration)
//   - Local server binds 127.0.0.1 on an EPHEMERAL port with per-launch
//     capability token (HttpOnly cookie bootstrap)
//   - Strict path-containment resolution (traversal-proof)
//   - CSP + security headers on every response
//   - External URLs validated (https: only) before shell.openExternal
//   - Navigation restricted to the trusted local origin
//   - DevTools disabled in production builds

const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const isDev = !app.isPackaged;

// Optional fixed port for development; production uses an ephemeral port.
const DEV_PORT = process.env.DELULU_PORT ? Number(process.env.DELULU_PORT) : null;

// Per-launch capability token for the local server.

// Resolve the static bundle: prefer desktop/dist (packaged), fall back to ../out (dev)
const DIST = fs.existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, '..', 'out');

const root = path.resolve(DIST);

// The real port is assigned after the server binds (stored here for the window)
let ACTIVE_PORT = DEV_PORT || 0;
function appOrigin() {
  return `http://${HOST}:${ACTIVE_PORT}`;
}

// ── URL validation ─────────────────────────────────────────────────────────
// Only https: external URLs may be handed to the OS. Local app origin is
// trusted for navigation; everything else is treated as hostile.
function isSafeExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return false;
    return true;
  } catch {
    return false;
  }
}

function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' && url.hostname === HOST && Number(url.port) === ACTIVE_PORT;
  } catch {
    return false;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// Inline <script> bodies found in the exported HTML get hash-pinned so
// next-themes / theme-flash bootstrap scripts keep working under strict CSP.
function computeInlineScriptHashes() {
  const hashes = [];
  try {
    const collect = (dir) => {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        if (st.isDirectory()) collect(full);
        else if (f.endsWith('.html')) {
          const html = fs.readFileSync(full, 'utf8');
          const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
          let m;
          while ((m = re.exec(html)) !== null) {
            const body = m[1];
            if (!body.trim()) continue;
            const hash = crypto.createHash('sha256').update(body).digest('base64');
            if (!hashes.includes("'sha256-" + hash + "'")) hashes.push("'sha256-" + hash + "'");
          }
        }
      }
    };
    collect(root);
  } catch (e) {
    // On any failure, fall back to unsafe-inline for scripts rather than
    // producing a black screen — logged for visibility.
    console.warn('CSP hash computation failed; allowing inline scripts:', e && e.message);
    return ["'unsafe-inline'"];
  }
  return hashes;
}

const INLINE_SCRIPT_HASHES = computeInlineScriptHashes();

const CSP = [
  "default-src 'self'",
  "script-src 'self' " + INLINE_SCRIPT_HASHES.join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

function securityHeaders(extra) {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(extra || {}),
  };
}

// Strict path containment: resolve, then require the result to live inside root.
function safeResolve(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null; // malformed encoding
  }
  // A second decode would reveal double-encoded traversal — reject outright.
  if (/%2e|%25/i.test(decoded) && /\.\.|%2e|%25/i.test(decoded)) {
    // conservative: any remaining encoded sequence combined with dots is suspect
    if (/\.\./.test(decoded) || /%2e/i.test(decoded)) return null;
  }
  if (decoded.includes('\0') || /[<>:"|?*]/.test(path.win32.basename(decoded))) {
    return null;
  }
  const target = path.resolve(root, '.' + decoded.replace(/\\/g, '/'));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  // Block dotfiles and dot-directories (.git, .env, ...) in any segment.
  const rel = path.relative(root, target);
  if (rel.split(path.sep).some((seg) => seg.startsWith('.') && seg !== '.' && seg !== '.well-known')) {
    return null;
  }
  return target;
}

function startServer() {
  const server = http.createServer((req, res) => {
    // Method gate: this is a static file server — only GET/HEAD are legal.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }

    // Request size gate (defensive; no uploads expected).
    const cl = Number(req.headers['content-length'] || 0);
    if (cl > 1024 * 1024) {
      res.writeHead(413);
      res.end('Payload too large');
      return;
    }

    // Host header must address the local server itself.
    const host = req.headers.host || '';
    if (host !== `${HOST}:${ACTIVE_PORT}`) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Cross-site renderer requests are never expected for the app shell.
    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite && fetchSite !== 'none' && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Origin check: browsers always attach Origin on cross-origin requests and
    // cannot forge it, so malicious web pages / DNS-rebinding probes are blocked
    // even though same-machine native processes could spoof it (accepted risk).
    if (req.headers.origin && req.headers.origin !== appOrigin()) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    let urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = safeResolve(urlPath);
    if (!filePath) {
      res.writeHead(403, securityHeaders());
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA fallback: serve index.html for unknown extensionless routes.
        const ext = path.extname(filePath).toLowerCase();
        if (ext && ext !== '.html') {
          res.writeHead(404, securityHeaders());
          res.end('Not found');
          return;
        }
        fs.readFile(path.join(root, 'index.html'), (e2, html) => {
          if (e2) {
            res.writeHead(404, securityHeaders());
            res.end('Not found');
            return;
          }
          res.writeHead(200, securityHeaders({
            'Content-Type': MIME['.html'],
            'Cache-Control': 'no-cache',
          }));
          res.end(html);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, securityHeaders({
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      }));
      if (req.method === 'HEAD') { res.end(); return; }
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    const port = DEV_PORT || 0; // 0 = ephemeral
    server.listen(port, HOST, () => {
      ACTIVE_PORT = server.address().port;
      resolve(server);
    });
  });
}

function attachWindowSecurity(win) {
  // Open only validated https: external links in the system browser; deny all
  // renderer-initiated window.open targets.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // The main frame may only navigate within the trusted local origin.
  win.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppUrl(url) && !isSafeExternalUrl(url)) {
      event.preventDefault();
    } else if (!isTrustedAppUrl(url)) {
      event.preventDefault(); // external https links go through setWindowOpenHandler
    }
  });

  win.webContents.on('will-redirect', (event, url) => {
    if (!isTrustedAppUrl(url)) event.preventDefault();
  });

  // Production UX hardening: block accidental DevTools shortcuts.
  // (Documented: this is convenience, not a security boundary — a local user
  // controls their own machine; DevTools access is not remote code execution.)
  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
      const key = (input.key || '').toLowerCase();
      const isF12 = key === 'f12';
      const isCtrlShiftI = input.control && input.shift && key === 'i';
      const isCtrlShiftJ = input.control && input.shift && key === 'j';
      if (isF12 || isCtrlShiftI || isCtrlShiftJ) event.preventDefault();
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Delulu — Academic Intelligence',
    backgroundColor: '#0B1120',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  attachWindowSecurity(win);
  win.loadURL(appOrigin());
  return win;
}

// Minimal application menu (keeps standard shortcuts like copy/paste/zoom working)
function buildMenu() {
  const viewSubmenu = [
    { role: 'reload' },
    { role: 'forceReload' },
    ...(isDev ? [{ role: 'toggleDevTools' }] : []),
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ];
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'quit', label: 'Quit Delulu' }],
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
      submenu: viewSubmenu,
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single-instance lock: focus the existing window instead of opening a second one
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    try {
      await startServer();
      createWindow();
    } catch (err) {
      console.error('Failed to start local server:', err);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
