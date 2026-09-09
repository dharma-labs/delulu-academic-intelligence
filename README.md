# Delulu — Academic Intelligence

A complete, offline-first academic management system: subjects, syllabus tracking, marks & CA, attendance, exams, assignments, tasks, notes, a Pomodoro focus timer, SM-2 spaced-repetition revision, timetable, calendar, analytics, AI tutor, exam-resource (ER) center, and a printable report — across **desktop, mobile, and tablet**.

This repository is one codebase that ships four targets:

| Target | Tech | Build command | Output |
|---|---|---|---|
| Web app + PWA | Next.js 16 (standalone) | `npm run build:standalone` | `.next/standalone` |
| Web app (static) + PWA | Next.js 16 (static export) | `npm run build:export` | `out/` |
| **Desktop** (Windows / macOS / Linux) | Electron | `npm run desktop:build` | `release/` installers |
| **Mobile + Tablet** (Android / iOS) | Capacitor | `npx cap sync` then Android Studio / Xcode | APK / IPA |

> Tablet is the **same** Android/iOS binary — the responsive layout automatically switches to the tablet sidebar + tablet grid between 768–1024 px (and iPad landscape gets the full desktop layout).

---

## Requirements

- Node.js **20+** (tested on 22)
- npm 10+
- Desktop builds: nothing extra (Electron is bundled)
- Android builds: [Android Studio](https://developer.android.com/studio) + JDK 17
- iOS builds: macOS + [Xcode](https://developer.apple.com/xcode/)

---

## Quick start (web)

```bash
npm install

# Development (hot reload)
npm run dev            # http://localhost:3000

# Production server (full features incl. live AI tutor)
npm run build:standalone
npm start              # http://localhost:3000
```

---

## Desktop app (Electron)

```bash
npm install

# Run in development (opens a native window)
npm run desktop:dev

# Build Windows/macOS/Linux installers + portable exe
npm run desktop:build
# Output: release/Delulu-0.2.1-*.exe (NSIS installer + portable)
```

The desktop app bundles the static export and serves it over a tiny local server
(port `4571` by default, override with `DELULU_PORT`). It runs fully offline.

To add a custom icon, drop `icon.ico` (Windows) / `icon.icns` (macOS) / `icon.png`
(Linux) into `desktop/build/` and rebuild.

---

## Mobile + Tablet app (Capacitor)

```bash
npm install

# 1) Build the static bundle and copy it into both native projects
npx cap sync

# 2a) Android — open in Android Studio, then Build > Build APK / Run
npx cap open android

# 2b) iOS — macOS only
npx cap open ios
```

The native projects live in `android/` and `ios/` (already generated). To rebuild
the web assets after any code change, run `npm run build:export && npx cap sync`.

App identity: `com.delulu.academic` (change in `capacitor.config.ts` if needed).

---

## AI Tutor

The AI Tutor works in three modes, automatically:

1. **Live AI** (web standalone build) — uses the bundled `/api/ai-tutor` route.
2. **Live AI via remote API** — set `NEXT_PUBLIC_API_BASE_URL=https://your-host`
   before building (`npm run build:export` / `cap sync`). Point it at a deployed
   standalone instance of this app.
3. **Offline fallback** — if no API is reachable (static export, Electron, or a
   Capacitor build without an API base URL), the tutor answers with curated,
   study-strategy responses. Everything else in the app works fully offline.

---

## Project structure

```
academics-app/
├── src/
│   ├── app/                 # Next.js layout + page + API routes
│   ├── components/          # App shell, shared UI, shadcn/ui primitives
│   ├── views/               # 18 feature views (dashboard, subjects, …)
│   └── lib/
│       ├── store.ts         # Zustand store + localStorage persistence + seed data
│       ├── types.ts         # Data model
│       └── achievements.ts  # Gamification
├── public/                  # PWA manifest, service worker, icons
├── desktop/                 # Electron main/preload + builder config
├── scripts/                 # Cross-platform build helpers
├── android/                 # Capacitor Android project (generated)
├── ios/                     # Capacitor iOS project (generated)
├── capacitor.config.ts      # Mobile/tablet app config
└── out/                     # Static export (generated)
```

### Data & storage

All data is stored client-side in `localStorage` (key `delulu-v4-data`), so every
target works offline and sync-free. Export/import and reset live under **Settings**.
The `prisma/` schema and `db/` folder are legacy scaffolding and are not used at
runtime by the app.

---

## Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` / `build:standalone` | Production server build → `.next/standalone` |
| `npm run build:export` | Static bundle → `out/` |
| `npm start` | Run the standalone production server |
| `npm run desktop:dev` | Launch the Electron desktop app |
| `npm run desktop:build` | Package desktop installers → `release/` |
| `npx cap sync` | Rebuild static bundle + copy into Android/iOS |
| `npx cap open android` | Open the Android project in Android Studio |
| `npx cap open ios` | Open the iOS project in Xcode |
