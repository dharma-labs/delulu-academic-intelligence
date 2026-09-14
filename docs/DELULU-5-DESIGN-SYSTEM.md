# Delulu 5.x Design System

Single source of truth for the One UI-inspired redesign. Non-destructive —
existing shadcn/tailwind theme remains the base; `--dl-*` tokens alias it.

## Design tokens (`src/app/globals.css` `:root`)

| Token | Aliases | Purpose |
|-------|---------|---------|
| `--dl-background` | `--background` | app canvas |
| `--dl-surface` | `--card` | primary cards |
| `--dl-surface-secondary` | `--secondary` | muted surfaces |
| `--dl-surface-elevated` | `--popover` | overlays/menus |
| `--dl-text-primary` | `--foreground` | headings |
| `--dl-text-secondary` / `--dl-text-muted` | `--muted-foreground` | body / captions |
| `--dl-primary` | `--primary` | brand accent |
| `--dl-border` | `--border` | hairline separators |
| `--dl-radius-sm/md/lg/xl` | `0.5/0.75/1/1.5rem` | corner radii |

## Information architecture (sidebar)

```
Home        Home · Now
Academics   Subjects · Attendance · Marks & CA · Exams · Assignments · Files
Study       Focus · Revision · Notes · Tasks
Planning    Calendar · Timetable
Insights    Analytics · Reports
Tools       ER Center
Settings    (bottom)
```

- Files is a first-class **Academics** feature.
- AI Tutor is removed from navigation (view code retained, not registered in nav).

## Key components

| Component | File | Role |
|-----------|------|------|
| `SemesterSwitcher` | `src/components/semester-switcher.tsx` | global semester context (spec §52/§53); switches view, never data |
| `NowHero` | `src/components/now-hero.tsx` | Home hero from the deterministic now engine |
| `buildNowContexts` | `src/lib/now-context.ts` | pure "what matters right now" engine (spec §19/§28 — no duplicated state) |
| `useSemesterFilter` | `src/lib/use-semester-filter.ts` | store-backed semester filter (shared across views) |
| motion variants | `src/lib/motion.ts` | centralized motion with reduced-motion support (§26) |

## Themes

Light and dark both derive from the same component architecture (semantic
tokens). Dark mode is a calm, deep, low-glare palette — not a simple inversion.

## Motion

Centralized in `src/lib/motion.ts` (`pageEnter`, `fadeUp`, `cardExpand`,
`sheetOpen`, `stagger`). Respect `prefers-reduced-motion` via
`reducedMotionVariants()` + framer-motion's `useReducedMotion`.

## Responsive behaviour

- Large desktop: expanded sidebar, multi-column content.
- Medium: compact sidebar, reduced columns.
- Small: collapsible sidebar / bottom nav, stacked content, intentional
  horizontal scroll only.

## Migration rules

1. Never delete working code until its replacement is verified.
2. Preserve route ids — migrate labels independently of routes.
3. No mock data in production paths.
4. Data stays the source of truth: repositories/state → selectors → UI.
5. Free/Pro logic and academic data are never coupled to presentation.

## Feature ownership (keep decoupled)

- Academic logic ↔ dashboard components — decoupled (now-context engine is pure).
- Upload logic ↔ Home — decoupled (Files view owns uploads).
- Theme ↔ permissions — independent.
- Pricing ↔ CSS — never coupled.

---

*Delulu by Dharmendra · [kumarsbm005@gmail.com](mailto:kumarsbm005@gmail.com) · [@d4.5dx](https://instagram.com/d4.5dx)*
