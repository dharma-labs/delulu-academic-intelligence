# Desktop app (Windows)

The desktop app wraps the Next.js standalone server in an Electron shell.

## What it is

- `main.js` boots the bundled server (`app/server.js`) on `127.0.0.1:3210`
  using Electron's embedded Node runtime, then opens a native window.
- The server is a Next.js `output: "standalone"` build (full app, including
  API routes such as the AI Tutor).

## Rebuild from source

```bash
# from the repo root
npm install
npm run build              # produces .next/standalone

# stage the standalone server into the desktop app
rm -rf desktop/app && mkdir -p desktop/app
cp -r .next/standalone/.next/static .next/standalone/.next/
cp -r public .next/standalone/
cp -r .next/standalone/* desktop/app/

# build the installer
cd desktop
npm install
npx electron-builder --win
```

Artifacts are written to `desktop/release/`:

- `Delulu-Academic-Setup-0.2.1.exe` — NSIS installer
- `Delulu-Academic-Portable-0.2.1.exe` — portable single-file build

## Notes

- Requires a valid `icon.png` (512×512) next to `desktop/package.json`.
- The AI Tutor API route needs the `z-ai-web-dev-sdk` credentials configured
  at runtime; the rest of the app works fully offline.
