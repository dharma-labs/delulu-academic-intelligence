# Delulu 4.0 — Worklog

## Project Overview
Delulu 4.0 is a comprehensive academic operating system for university students, built as a Next.js 16 SPA with Zustand, shadcn/ui, and Tailwind CSS.

## Architecture
- **Framework**: Next.js 16 (App Router, single `/` route, client-side navigation)
- **State**: Zustand v5 with persist middleware (localStorage)
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide icons
- **Theme**: Light/Dark/System with custom Delulu palette (custom CSS variables)
- **Views**: 19 client-side views loaded via `next/dynamic({ ssr: false })`

## Completed Features (19 views, ~13,000 lines)

### Foundation
- Custom design tokens and color system (light/dark mode)
- Zustand store with 45+ actions, SM-2 algorithm, demo seed data
- App shell: Desktop sidebar (collapsible), mobile bottom nav, command palette (⌘K)
- View router with skeleton loading

### Core Views
1. **Dashboard**: Greeting, semester health (72/100), today's focus, academic pulse, quick actions
2. **Subjects**: CRUD with search, color-coded cards, health signals, grade display
3. **Subject Detail**: 7-tab workspace (overview, syllabus, marks, attendance, revision, notes, exams)
4. **Focus Timer**: Setup/active/complete phases, SVG progress ring, session tracking
5. **Revision SM-2**: Due items with quality buttons (Again/Hard/Good/Easy), mastery levels
6. **Notes**: Split-view editor, search, subject/topic linking, auto-save
7. **Tasks**: 5-tab system (Today/Overdue/Upcoming/Somed/Done), CRUD
8. **Timetable**: Weekly grid (desktop), today's vertical schedule (mobile), next class card
9. **Calendar**: Month grid, event dots, day detail panel
10. **Marks & CA**: SGPA/CGPA display, per-subject performance, all assessments
11. **Attendance**: Per-subject stats, bulk mark, SAFE/WATCH/RISK projections
12. **Exams**: Upcoming/completed management with PYQ bank
13. **Assignments**: Deadline tracking, status management
14. **Analytics**: Study heatmap (35 days), distribution charts, trends, insights
15. **ER Command Center**: Paper tracking by priority (Critical/High/Normal/Low)
16. **Settings**: Profile, appearance (theme), data export/import, reset
17. **AI Tutor**: Chat interface with LLM backend API, offline fallback
18. **Reports**: Professional academic report with print/PDF/download

## Known Issues
- Analytics view: ESLint JSX parsing false-positive (known ESLint limitation with complex single-line JSX)
- All other views pass lint cleanly and work correctly in browser

## Technical Details
- Store: `/src/lib/store.ts` (1,174 lines)
- Types: `/src/lib/types.ts` (360 lines)
- Shell: `/src/components/app-shell.tsx` (601 lines)
- View Router: `/src/components/view-router.tsx` (uses `next/dynamic` with `ssr: false`)
- API: `/src/app/api/ai-tutor/route.ts`

## Data Model
All data persisted to localStorage under key `delulu-v4-data`. No backend required.
5 subjects with full syllabus, assessments, attendance, timetable, tasks, etc. pre-seeded.
