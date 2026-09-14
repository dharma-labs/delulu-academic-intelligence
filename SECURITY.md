# Delulu Security

**Delulu 4.2 Security Status — hardening implemented, production-verified**

Delulu is an offline-first desktop application (Electron + Next.js static export).
All academic data lives on the user's device. This document describes the security
architecture, what was hardened in 4.2, and honest remaining risks.

---

## Security architecture

```
┌──────────────────────────────────────────────────────┐
│ Electron main (trusted)                              │
│  - Serves static bundle over 127.0.0.1:<ephemeral>   │
│  - Per-launch capability token (HttpOnly cookie)     │
│  - CSP + security headers on every response          │
│  - Path-traversal-proof static resolver              │
│  - External URL validation (https: only)             │
│  - Navigation locked to the trusted local origin     │
├──────────────────────────────────────────────────────┤
│ Preload (contextBridge, sandboxed)                   │
│  - Exposes only: platform, isDesktop, version        │
│  - No filesystem, no IPC passthrough, no shell       │
├──────────────────────────────────────────────────────┤
│ Renderer (UNTRUSTED)                                 │
│  - Static Next.js export, React-escaped rendering    │
│  - All academic data in localStorage/IndexedDB       │
│  - No secrets, no tokens, no privileged APIs         │
└──────────────────────────────────────────────────────┘
```

## Hardened in 4.2

| ID | Area | Change | Verification |
|----|------|--------|--------------|
| SEC-1 | BrowserWindow | `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false` added alongside existing `contextIsolation: true`, `nodeIntegration: false` | Config inspection |
| SEC-2 | Local server | Ephemeral port (`listen(0, 127.0.0.1)`) replaces fixed 4571; port read from `server.address()` | `node --check` + launch test |
| SEC-3 | Local server | Per-launch capability token; bootstrap via `?auth=<token>` on index, then HttpOnly `SameSite=Strict` cookie; requests without either → 403 | Launch + curl tests |
| SEC-4 | Local server | `Host` header must be `127.0.0.1:<port>`; `Origin` (when present) must match app origin; `Sec-Fetch-Site: cross-site` rejected | curl tests with forged headers |
| SEC-5 | Path traversal | Strict containment resolver: single decode, rejects `..`, backslashes, residual percent-encoding, NUL, dotfiles; `path.resolve` + `startsWith(root + sep)` | Traversal test list (§ below) |
| SEC-6 | Headers | CSP (`default-src 'self'`, no `unsafe-eval`, `frame-src 'self' blob:` for PDF previews, `img-src blob:` for previews), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` on every response | Header inspection |
| SEC-7 | Methods | Only GET/HEAD; 405 otherwise; 1 MB request-size cap | curl POST test |
| SEC-8 | External URLs | `isSafeExternalUrl()` — https: only, never localhost; every `shell.openExternal` call site validated; `setWindowOpenHandler` always denies renderer popups | Protocol test list |
| SEC-9 | Navigation | `will-navigate` / `will-redirect` locked to trusted local origin | Manual |
| SEC-10 | DevTools | Disabled in production (menu item removed, F12/Ctrl+Shift+I/J blocked). Dev builds unaffected | Packaged run |
| SEC-11 | Preload | Audited: exposes only `platform`/`isDesktop`/`version` — no generic IPC, no fs, no shell | Code inspection |

## Path traversal tests (all rejected)

```
/../main.js                        → 403
/../../Windows/System32/           → 403
/..%2f..%2fWindows/                → 403
/%2e%2e%2f                         → 403
/%252e%252e%252f                   → 403
/..%5c..%5cWindows/                → 403
/\/..\/Windows/                    → 403
/C:%5CWindows/system32             → 403
//server/share                     → 403
/.git/config                       → 403 (dotfile)
```

## External URL tests

| URL | Result |
|-----|--------|
| `https://exam.du.ac.in/...` | OPEN (system browser) |
| `http://evil.com` | BLOCK |
| `file:///C:/Windows/...` | BLOCK |
| `javascript:alert(1)` | BLOCK |
| `data:text/html,...` | BLOCK |
| `ms-msdt:` / `search-ms:` / `smb:` / `powershell:` | BLOCK |
| `http://127.0.0.1:4571` (local) | BLOCK (never handed to OS) |

## Threat model honesty

- **127.0.0.1 is not 0.0.0.0.** The server was never LAN-exposed. The realistic
  attacker is a **same-machine** process or a malicious web page in the user's
  browser (DNS rebinding / cross-site requests) — mitigated by Host/Origin/
  Sec-Fetch-Site/capability-token checks.
- **DevTools access is not RCE.** Blocking production DevTools is UX hardening;
  a local user already controls their own session and their own data.
- **localStorage academic data is not secret.** Marks/attendance/notes carry no
  credentials. Encrypting them with `safeStorage` protects against other local
  user accounts, not against the logged-in user; not applied in 4.2 to avoid a
  risky data migration. Re-evaluate if sync/cloud features ever ship.

## Remaining risks (honest)

- **Not code-signed**: Windows SmartScreen will warn on first run. Signing
  readiness exists in `desktop/electron-builder.yml` (env-var based); requires a
  certificate purchase.
- **No auto-update yet**: updates are manual (download new release). electron-updater
  with signed artifacts is the planned path — deliberately not half-implemented.
- **CSP allows `style-src 'unsafe-inline'`**: required by Next.js static export
  inline styles; script-src stays strict `'self'`.
- **Dependency audit**: `npm audit` reviewed; no known-exploitable path in the
  packaged surface (Electron 43.x current at release time).

## Developer principles (carry forward)

1. The renderer is untrusted.
2. IPC is an API — validate every input (preload exposes none today; keep it that way).
3. Frontend code is public — never ship secrets.
4. External URLs are hostile — validate before opening.
5. Filesystem paths are hostile — resolve and contain.
6. Localhost is not automatically trusted — this server checks Host/Origin/token.
7. Local storage is not a security boundary.
8. Updates must be authenticated when they exist.

---

*Delulu by Dharmendra · [kumarsbm005@gmail.com](mailto:kumarsbm005@gmail.com) · [@d4.5dx](https://instagram.com/d4.5dx)*
