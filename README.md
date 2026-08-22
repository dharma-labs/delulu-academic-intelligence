# Delulu — Academic Intelligence

A comprehensive, offline-first academic management system with AI-powered
insights, spaced repetition, and intelligent scheduling. Built as a
premium, FlowTune-inspired progressive web app (PWA).

## Features

- **18 views** covering the full academic workflow:
  - Dashboard (health ring, study streak, deadlines, quick actions)
  - Subjects & subject detail, Marks, Exams (countdowns + filters)
  - Assignments, Tasks, Attendance, Calendar, Timetable
  - Notes, Revision (spaced repetition), Focus (Pomodoro)
  - Analytics (with CSV export), Report (printable), ER Center
  - AI Tutor (chat, syllabus-aware context)
  - Achievements, Onboarding, Settings, dark mode
- **Offline-first**: all data persists in `localStorage` (zustand `persist`)
- **PWA**: installable on desktop and mobile, with service worker + manifest
- **Dark / light mode**, animated counters, gradient progress bars
- **18+ achievements** with progress tracking

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, React 19)
- TypeScript, Tailwind CSS v4, shadcn/ui (Radix)
- Zustand (persisted state), Recharts, dnd-kit, framer-motion
- Prisma (SQLite) — used only by API routes, not the core client app

## Getting Started

Requirements: Node.js 20+ (npm) or Bun.

```bash
npm install
npm run dev          # http://localhost:3000
```

### Production build (standalone server)

```bash
npm run build
npm run db:generate  # optional — only needed for API routes
npm start            # serves .next/standalone/server.js
```

## Desktop & Mobile apps

- **Desktop (Windows)**: Electron wrapper, see `desktop/`
- **Mobile (Android)**: Capacitor wrapper, see `mobile/`

Build scripts:

```bash
npm run desktop:build   # produces a Windows installer (.exe)
npm run mobile:build    # produces an Android .apk
```

See [DESKTOP.md](DESKTOP.md) and [MOBILE.md](MOBILE.md) for details.

## Configuration

Copy `.env.example` to `.env`. The core app needs no secrets; `DATABASE_URL`
is only used by Prisma/API routes.

## License

MIT
