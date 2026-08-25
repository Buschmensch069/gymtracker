# Gym Tracker

Personal, offline-first gym workout tracker PWA. Single user (me), no auth, no
backend, no cloud sync. Installed to iPhone home screen via Safari's "Add to
Home Screen". All persistence is local, in IndexedDB via Dexie.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** — configured via the `@tailwindcss/vite` plugin (no
  `tailwind.config.ts`, no PostCSS config). Custom utilities (safe-area
  helpers, etc.) are declared directly in `src/index.css` with `@utility`.
- **Dexie.js** (IndexedDB) — the only datastore. No Redux/Zustand/React Query.
- **vite-plugin-pwa** — service worker + web app manifest.
- **Recharts** — for charts (later phase; not used in Phase 1).
- **React Router** — client-side routing, bottom-tab app shell.
- Deploy target: **Vercel**.

There is no backend and never will be for this app's current scope. Don't
add API routes, server code, or auth.

## Data Model

All entities use `string` UUID primary keys (`crypto.randomUUID()`, see
`src/lib/ids.ts`) — **never** Dexie auto-increment numbers. This matters
because export/import (Settings) round-trips the entire DB as JSON; UUIDs
survive that round-trip without collisions, autoincrement IDs would not.

```ts
Exercise {
  id: string
  name: string
  primaryMuscle: PrimaryMuscle
  secondaryMuscles: PrimaryMuscle[]
  equipment: Equipment
  isCustom: boolean
  notes: string
}

Routine {
  id: string
  name: string
  exercises: { exerciseId: string; targetSets: number; targetRepRange: string }[]
}

Workout {
  id: string
  routineId?: string
  startedAt: number   // epoch ms
  finishedAt?: number // epoch ms; undefined = workout still in progress
  notes: string
}

WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  order: number
}

SetLog {
  id: string
  workoutExerciseId: string
  setNumber: number
  weightKg: number   // always stored in kg regardless of display unit
  reps: number
  rpe?: number
  type: 'warmup' | 'normal' | 'dropset' | 'failure'
  completed: boolean
  timestamp: number  // epoch ms, when the set was logged/completed
}

Setting {
  key: string          // 'unitPreference' | 'seedVersion' | ...
  value: unknown
}
```

**Routine is schema-only in Phase 1.** The table exists for forward
compatibility but there is no create/edit/start-from-routine UI yet, and
`Workout.routineId` is always `undefined`. Don't build routine UI unless
explicitly asked.

**Units:** `weightKg` is the canonical stored unit, always. The kg/lb toggle
in Settings (`settings` table, key `unitPreference`) only affects display
formatting (`src/lib/units.ts`) — never the stored value. Never store a
weight in lb.

## Conventions

- **Dexie is the single source of truth.** Reads go through
  `useLiveQuery` (from `dexie-react-hooks`) so components re-render
  automatically when the underlying tables change — no manual refetch or
  cache invalidation. Writes are plain `async` calls to
  `db.table.add/update/delete/bulkAdd` directly in event handlers. Do not
  introduce Redux/Zustand/Context-as-a-store for anything Dexie already
  covers.
- **"Active workout" is derived, not tracked separately.** It's just
  `db.workouts` where `finishedAt` is `undefined`. This means killing the
  app mid-workout and relaunching naturally resumes it — don't add a
  separate "current workout id" flag anywhere.
- **Ephemeral UI state** (open sheet, draft form values, selected filter
  chips before commit) stays as local component `useState`. Never persist
  transient UI state to Dexie.
- **Dark theme only.** No light theme, no toggle, no `prefers-color-scheme`
  branching. `<html class="dark">` is hardcoded; don't build theming
  infrastructure for a variant that doesn't exist yet.
- **Numeric inputs use `type="text"` + `inputMode="decimal"` or
  `inputMode="numeric"`** — never `type="number"`, which shows the wrong
  iOS keyboard and unwanted spinner UI. See `WeightRepsInput`.
- **No `position: fixed` for bottom action bars.** Use normal flex-flow
  layout (`flex flex-col`, scrollable middle section, bottom bar as a
  regular flex child) so the iOS keyboard doesn't fight fixed positioning.
  See the iOS keyboard note below.
- **Safe areas**: use the `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe`
  utilities defined in `src/index.css` (backed by
  `env(safe-area-inset-*)`) rather than hardcoding padding on
  notch/home-indicator-adjacent elements.

## iOS PWA Notes

- `registerType: 'autoUpdate'` is intentional (see `vite.config.ts`) — solo
  user, no team-coordination risk from an SW update landing silently on next
  launch.
- iOS Safari never fires `beforeinstallprompt`. Don't build install-prompt
  logic around that event; it will never fire there.
- Standalone-mode detection: check both `window.navigator.standalone`
  (iOS-specific) and `window.matchMedia('(display-mode: standalone)')`.
- Root layout height uses `100dvh` (with a `100vh` fallback via
  `@supports`) — never bare `100vh`, which on iOS Safari includes the area
  under the collapsible URL bar and causes layout jump.
- `apple-touch-icon` is referenced via an explicit `<link>` tag in
  `index.html`, not just the manifest `icons` array — iOS does not reliably
  read it from the manifest.

## Folder Structure

```
src/
  db/            Dexie schema, types, seed data, seeding logic
  features/      one folder per feature area (exercises, workout, history, settings)
                 — page components + feature-local hooks/subcomponents live together
  components/
    layout/      app shell chrome (bottom tab bar, page header)
    ui/          generic reusable primitives (button, input, sheet, stepper)
  hooks/         cross-cutting hooks not tied to one feature
  lib/           pure helper functions (units, ids, dates)
```

## Seed Data

`src/db/seedData/` has one file per primary muscle group, concatenated in
`seedData/index.ts`. Tagging convention — apply consistently if extending:

- **Primary muscle** = the colloquial category a lifter would file the
  exercise under (e.g. Romanian Deadlift → `hamstrings`, not `back`), not
  strict EMG activation data.
- **Secondary muscles** = a short, conservative list (1-2, rarely 3) of
  obviously-involved synergists — not exhaustive. Don't tag `core` on
  everything just because most lifts involve some bracing.
- Different equipment variants of the same movement (barbell vs dumbbell
  bench press) are separate exercise rows, matching the single-`equipment`-
  field data model — not one row with an equipment selector.

Seeding is idempotent via a `seedVersion` counter in the `settings` table
(`src/db/seed.ts`), not a bare "is the table empty" check — this means a
user who deletes all seeded exercises on purpose won't have them
silently re-added, and future corrections to seed data can be shipped by
bumping `SEED_VERSION` without touching user edits or custom exercises.
