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
- **Recharts** — Analytics tab charts (weekly muscle sets, e1RM trend,
  tonnage, consistency).
- **lucide-react** — the only icon set. Don't hand-roll inline SVG icons.
- **@dnd-kit/core + @dnd-kit/sortable** — drag-to-reorder for routine
  exercises (`RoutineExerciseRow.tsx`). Not used anywhere else; reach for it
  again before adding a second drag-and-drop dependency.
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
  exerciseId: string   // denormalized from workoutExercises — see below
  workoutId: string    // denormalized from workoutExercises — see below
  setNumber: number
  weightKg: number   // always stored in kg regardless of display unit
  reps: number
  rpe?: number
  type: 'warmup' | 'normal' | 'dropset' | 'failure'
  completed: boolean
  timestamp: number  // epoch ms, when the set was logged/completed
  touched?: boolean  // has the user entered a real value? see below
}

Setting {
  key: string          // 'unitPreference' | 'seedVersion' | 'lastExportedAt' |
                        // 'persistentStorageRequested' | 'persistentStorageGranted' | ...
  value: unknown
}
```

**Denormalized fields on SetLog.** `exerciseId` and `workoutId` duplicate
what's already derivable via `workoutExerciseId` → `WorkoutExercise`. They're
denormalized on purpose: Phase 2 charts need queries like "every set ever
logged for exercise X" or "every set in workout Y" across potentially
thousands of rows, and without these fields that's a multi-hop join
(`setLogs` → `workoutExercises` → filter) for every chart render. With them,
it's a single indexed `db.setLogs.where('exerciseId').equals(x)` lookup.
Always keep them in sync when creating a `SetLog` (see `addSet` in
`useActiveWorkout.ts`) — there's no automatic referential integrity in Dexie,
so a set created without populating these breaks chart queries for that row
until a migration backfills it.

**SetLog.touched** — whether the user has directly entered a weight/reps
value for this set. `0` is a legitimate real value (bodyweight exercises),
so it can't double as an "unset" sentinel — `touched` is what
`SetLogRow`/`WeightRepsInput` use to decide whether to show the
last-session placeholder instead of the stored number. `addSet`
(`useActiveWorkout.ts`) sets it to `last?.touched ?? false` on a new row: a
truly first set is untouched; a set carrying forward an already-touched
value inherits `touched: true` immediately (it already shows a real
number). Sets created back-to-back with nothing real yet — e.g.
`startWorkoutFromRoutine`'s pre-populate loop — chain that `?? false`
through and all stay untouched, with no special-casing needed.
`updateSet` flips it to `true` the moment `weightKg`/`reps` change, or a
set is marked `completed`. It's a plain **non-indexed** field, so per the
Dexie Schema Migrations rules below it needed no `version()` bump. Rows
from before this field existed have `touched === undefined` — every read
site treats that as `touched ?? true` (old logged data is real, never
placeholder-eligible).

**Routines** (`Routine`/`RoutineExercise`) are fully built out: create,
edit, delete, reorder exercises via drag (`features/routines/`). "Start
Routine" calls `startWorkoutFromRoutine(routineId)`
(`useActiveWorkout.ts`), which sets `Workout.routineId`, adds each routine
exercise in order, then calls the existing `addSet` `targetSets` times per
exercise to pre-populate empty (untouched) set rows — no separate
set-creation path for routine-started workouts.

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
- **Dexie excludes `undefined`-valued fields from indexes entirely** (this
  is an IndexedDB limitation, not a Dexie choice — `undefined` isn't a
  valid IndexedDB key). A row whose indexed `finishedAt` is `undefined`
  simply isn't in that index at all. That means the active-workout lookup
  **must** use `db.workouts.filter((w) => w.finishedAt === undefined)`,
  never `db.workouts.where('finishedAt').equals(undefined)` — the latter
  can't match anything, since unset rows were never indexed in the first
  place. `where()` on `finishedAt` is still fine (and indexed) for queries
  where the value **is** set, e.g. history's `finishedAt !== undefined`
  filter or a future "workouts finished after date X" query. Same
  reasoning is why `isCustom` (a boolean) isn't indexed at all — IndexedDB
  doesn't support boolean keys, so `useExercises.ts` filters in memory
  instead; fine at this dataset size (hundreds of rows).
- **Abandoning a workout is a hard delete, not a soft "finish."** Use
  `discardWorkout()` (`useActiveWorkout.ts`) for a workout the user starts
  and doesn't want to keep — it deletes the `Workout`, its
  `WorkoutExercise` rows, and their `SetLog` rows outright. Don't repurpose
  `finishWorkout()` for this; a discarded session should never show up in
  History.
- **The active workout is visible from every tab.** `ActiveWorkoutBanner`
  (`features/workout/`) is rendered in `AppShell.tsx` as a normal flex
  sibling between the page `Outlet` and `BottomTabBar` — not
  `position: fixed` — and shows itself whenever `useActiveWorkout()` is
  non-null and the route isn't `/workout` already. Follow this pattern
  (flex sibling in `AppShell`, not fixed) for any future persistent
  cross-tab chrome.
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
  notch/home-indicator-adjacent elements. Two rules go with them:
  - **Only on elements genuinely flush with that screen edge.** The bottom
    tab bar is; a page action bar rendered *above* it (see
    `ActiveWorkoutPage`) is not, and a `pb-safe` there is just 34px of dead
    space in the middle of the layout.
  - **At the bottom, reach for `pb-home-indicator`, not `pb-safe`.** The
    full 34px inset reserved inside the tab bar's own box left an empty
    strip under the icons that read as space held for Safari's toolbar.
    `pb-home-indicator` clamps it (`min(env(...), 6px)`) — the indicator
    needs a little clearance, not the whole inset. `pb-safe` remains right
    for a full-height overlay whose content really does run to the edge.

## Dexie Schema Migrations

When the schema needs to change, add a **new** `this.version(n)` call in
`src/db/schema.ts` — never edit an existing `version()` call in place.
Dexie replays every version in order for a returning user, so an edited
old version silently breaks upgrades for anyone not starting from empty.

- Only list the tables whose index string actually changed in that
  version's `.stores({...})` — Dexie carries forward the schema of
  unlisted tables from the previous version unchanged.
- If existing rows need their data reshaped (not just a new index), chain
  `.upgrade(async (tx) => { ... })` on that same `version()` call and
  migrate data with `tx.table(name).toCollection().modify(...)` or
  `tx.table(name).toArray()` + `bulkPut`. **Never assume the database is
  empty** — this app has been in someone's hands since v1, so an upgrade
  must handle real pre-existing rows, not just greenfield schemas. See the
  v2 migration (denormalizing `exerciseId`/`workoutId` onto `SetLog`) for
  the pattern: look up each row's parent, backfill the new fields, don't
  touch anything else.
- Bump `SCHEMA_VERSION` in `src/features/settings/dataTransfer.ts`
  independently if the **export/import JSON shape** changes — it's a
  separate version number from the Dexie schema version, since an export
  file's shape and the live DB's on-disk structure don't have to change in
  lockstep. Currently **v2** (added `RoutineExercise.restTimerSeconds`).
  When you bump it, also add the old version to
  `IMPORTABLE_SCHEMA_VERSIONS` and migrate it in `upgradeExport` — import
  is the only backup mechanism this app has and there's no cloud copy, so
  refusing a file the user exported last month is data loss by pedantry.
  Only refuse a version that genuinely can't be migrated forward.

## Visual Design System

- **Elevation tokens**, defined in `src/index.css`'s `@theme` block:
  `surface-0` (app bg) / `surface-1` (card) / `surface-2` (raised/active),
  `border`, `accent` + `accent-fg`. Tailwind v4 auto-generates
  `bg-surface-1`, `border-border`, `text-accent`, etc. from these — use
  them instead of raw `slate-800`/`slate-900`/`cyan-500` literals so
  elevation and the one accent color stay consistent app-wide.
- **`Card`** (`components/ui/Card.tsx`) is the raised-surface primitive —
  routine/history/PR-list rows use it instead of ad-hoc div classNames.
- **`Chip`** (`components/ui/Chip.tsx`) is the shared pill — takes an
  optional `color` dot (from `muscleColors.ts`) so identity never rests on
  color alone; a label is always present.
- **Muscle colors** (`src/lib/muscleColors.ts`): the 8 major hypertrophy
  muscle groups get validated categorical hues (see the `dataviz` skill —
  `node scripts/validate_palette.js` against this app's `#0b0f14` surface);
  the other 5 (forearms, calves, core, cardio, fullBody — rarely a
  *primary* tag in this app's seed data) get muted tones. The weekly-sets
  chart caps at 8 stackable series and folds anything past that into a
  muted "Other" segment rather than generating a 9th hue. **The fold is by
  rank overflow, applied after the chart's filter chips, not by
  priority-list membership**: the chart ranks the muscles that survived the
  filter by `CHART_MUSCLE_SERIES_ORDER` (the priority 8 first, then the
  muted remainder), names the first 8, folds only the rest. Folding over
  the unfiltered set would put muscles the user just excluded back on the
  chart as a grey bar; and selecting a single non-priority muscle must
  render one named series, not a lone "Other". Extend
  `MUSCLE_COLORS`/`CHART_MUSCLE_PRIORITY` together if a muscle's prominence
  should change.
- **Chart filter chips are filter-IN.** In `WeeklyMuscleSetsChart`, an
  empty selection means "All"; tapping a chip *selects* that muscle
  (multi-select accumulates), and deselecting the last one falls back to
  All. The chips are hidden in the Upper/Lower and Push/Pull/Legs modes and
  deliberately don't apply there — an invisible control shouldn't silently
  drop data.
- **A grey "Other" segment always names its contents.** The chart's custom
  tooltip lists which muscles are inside the fold for that week (carried on
  the row under `OTHER_PARTS_KEY`), in both the by-muscle and the grouped
  modes. Never ship an unexplained "Other" bar.
- **`src/lib/analytics.ts`** is the single source of truth for
  tonnage/PR/muscle-set-weighting definitions — extend it there, don't
  recompute a metric inline in a chart or card component. In particular:
  - `MUSCLE_SET_WEIGHT` (primary 1.0 / secondary 0.5) and
    `EPLEY_MAX_REPS_FOR_E1RM` (12) are documented constants, not magic
    numbers.
  - `isWorkingSet` (`completed && type !== 'warmup'`) is the shared
    definition behind every volume/PR metric.
  - `computeTonnage` deliberately **excludes warmups** — totals read lower
    than tools that count warmup volume. Intentional, not a bug.
  - `computePRProgression` is the single shared PR-detection pass (walks
    every working set chronologically, tracks running bests per exercise)
    — used by History card badges, `WorkoutDetailPage` per-set badges, and
    the Analytics PR List via the `usePRProgression()` hook
    (`src/hooks/`). Don't reimplement PR detection locally.
  - `useHistoryFeed.ts` and `useAnalyticsData.ts` each load their whole
    relevant tables into memory in one query (rather than one
    `useLiveQuery` per card/chart) and compute everything in JS. This only
    scales to a single-user, hundreds-to-low-thousands-of-rows dataset —
    same sizing assumption already noted above for `isCustom` filtering —
    revisit with date-range-limited queries first if this ever needs to
    scale further.

## iOS PWA Notes

- `registerType: 'autoUpdate'` is intentional (see `vite.config.ts`) — solo
  user, no team-coordination risk from an SW update landing silently on next
  launch.
- iOS Safari never fires `beforeinstallprompt`. Don't build install-prompt
  logic around that event; it will never fire there.
- Standalone-mode detection: check both `window.navigator.standalone`
  (iOS-specific) and `window.matchMedia('(display-mode: standalone)')` —
  `isStandaloneDisplay()` in `src/lib/standalone.ts` is the one place that
  does this; don't re-roll the check inline.
- Root layout height is always `var(--app-height)` — never a percentage and
  never a bare unit. It resolves to `100dvh` in a browser tab (with a `100vh`
  fallback via `@supports`; bare `100vh` there includes the area under the
  collapsible URL bar and causes layout jump) and to `100lvh` in standalone,
  where the small and large viewports differ — see the band note below.
  `html`, `body` and `#root` all take it together.
- **Standalone and in-browser need different viewport handling.**
  `useAppViewportHeight()` (`src/hooks/`) is a *corrective* layer over that
  CSS height, and returns `undefined` (meaning "let `100dvh` own it")
  whenever no correction is warranted:
  - *In a browser tab* the usable height genuinely moves as the URL bar and
    bottom toolbar collapse, and iOS Safari's `dvh` under/over-corrects
    through those transitions — so track `visualViewport.height`
    continuously there.
  - *Installed (standalone)* there is no browser chrome at all, so the CSS
    height is already exact — `100lvh` there, not `100dvh`, per the band note
    below. Overriding it is actively harmful: any measurement
    taken mid-transition (launch animation, app switcher, rotation) is
    smaller than the screen and freezes into the layout as an inline pixel
    height, leaving a dead band at the bottom that reads as space reserved
    for a toolbar that isn't there. So standalone only overrides while the
    keyboard is actually open (`visualViewport.height` below
    `window.innerHeight` by more than `KEYBOARD_MIN_SHRINK_PX`).
  - The result is clamped to `window.innerHeight`, and a non-zero
    `visualViewport.offsetTop` is pinned back to 0 (unless an input is
    focused) — iOS can leave the visual viewport scrolled down after a
    keyboard dismissal, which slides the header off the top of the screen.
- **The ~59px band at the bottom of the screen in standalone: the small
  viewport is not the large viewport.** Five rounds missed this. Clean
  measurements (no probe perturbing anything), 852pt iPhone, installed:
  `innerHeight`, `documentElement.clientHeight`, `body.clientHeight`,
  `100dvh`, `100svh` and an absolutely-positioned `height: 100%` **all agree
  at 793**; `100vh`, `100lvh` and `screen.height` are **852**. So the layout
  viewport genuinely is 793 and every percentage/`dvh` chain resolves to it
  correctly — while the document's canvas still paints across the full 852,
  which is why body's background shows in the band (confirmed: with a garish
  `background_color` and a contrasting `body` colour, the band came up
  **body's** colour, not the manifest's — it is ours, not iOS's window).
  On iOS 26+ the status bar area is excluded from the *small/dynamic*
  viewport but included in the *large* one, and `vh` is defined against the
  large viewport — so `100vh` and `100dvh` differ by the 59px top inset here.
  That means `--app-height`'s `@supports (height: 100dvh)` upgrade is what
  sizes the app to 793: the `100vh` fallback it replaces would have been 852.
  Ruled out along the way, by measurement rather than argument: the tab bar's
  own padding (6px, height ~67, flush with `innerHeight`); `pb-safe` vs
  `pb-home-indicator` and the clamped `min(env(...), 6px)`; background
  propagation; and the manifest `background_color`.

  **Fix (confirmed on device — tab bar flush, no band, everything 852):**
  `--app-height` resolves to `100lvh` in standalone via `html[data-standalone]` in `index.css`, stamped
  by `markStandaloneDisplay()` from `main.tsx` — an attribute rather than
  `@media (display-mode: standalone)` because iOS does not reliably match that
  query, so CSS and `isStandaloneDisplay()` share one answer. `html`, `body`
  and `#root` all take `var(--app-height)` together: a percentage on html/body
  resolves against the ICB (the small viewport, 793), and since body is
  `overflow: hidden` it would clip an 852px `#root` back to 793 and make the
  fix inert. `useAppViewportHeight` no longer clamps to `window.innerHeight`
  in standalone for the same reason — it probes `var(--app-height)` instead.

  So content sized past the small viewport *is* painted and laid out into the
  band — the rendering surface really does extend to the large viewport, which
  body's background reaching there had already hinted. The band was never
  unreachable; every previous round was just sizing the app to the wrong one
  of the two viewports.

  Two retractions, both from round 4, both caused by the probe: the claim
  that the initial containing block is inset 59px from the layout viewport is
  **false** (those numbers were taken while the probe forced
  `overflow: visible` on `html`/`body`/`#root`), and the
  `html, body { height: var(--app-height) }` change made on its strength was
  a **no-op** — at the time `--app-height` was `100dvh`, so both it and
  `height: 100%` resolved to 793. That declaration is in the tree again today
  and is not a reinstatement of the reverted change: it does real work only
  because standalone now resolves the variable to 852.
- **Any viewport probe must not perturb what it measures, and must be read
  visually.** Four measurement errors, in the order they cost a round:
  - Deriving the gap as `innerHeight - rect.bottom` is structurally blind to
    a gap living *below* `innerHeight`. It returned 0, was read as "no dead
    band", and started the padding hunt.
  - `getBoundingClientRect()` cannot locate anything on the *screen*. It
    reports `top: 0` both for a box painted under the status bar and for one
    painted below it. Screen position needs a photograph and a fixed
    `bottom: 0` hairline to measure against.
  - `html`, `body`, `#root` and `AppShell`'s root div are all
    `overflow: hidden`, so an over-tall probe rendered inside any of them is
    clipped and *looks* like a null result. Portal visual probes to
    `document.body`.
  - **But do not fix that by forcing `overflow: visible` globally** — that is
    what invalidated round 4. Changing overflow changes `innerHeight`. Only
    the *visual* half ever needed unclipping: `getBoundingClientRect()`
    already returns an element's full box regardless of any ancestor's
    overflow, so numeric probes need no override at all. Keep the two halves
    separate, and treat any number that moves when the probe is toggled as
    the probe's, not the page's.
- **Safe-area utilities set padding outright, so never combine them with a
  `py-*`/`px-*` on the same element.** `pt-safe`/`pb-safe` are emitted
  after Tailwind's own padding utilities, so `py-3 pt-safe` loses the `py-3`
  top padding entirely — which put the page title flush against the bottom
  edge of the status bar in standalone (inset ≈ 59px, zero gap) and flush
  against the very top of the viewport in-browser (inset 0). Put the inset
  on a wrapper and the visual padding on the child inside it; see
  `PageHeader.tsx`, `Sheet.tsx`, and `ActiveWorkoutPage`'s action bar.
- `apple-touch-icon` is referenced via an explicit `<link>` tag in
  `index.html`, not just the manifest `icons` array — iOS does not reliably
  read it from the manifest.
- **Only one element scrolls: the `.scroll-touch` region inside a page.**
  `html`/`body` are locked (`height: 100%; overflow: hidden;
  overscroll-behavior: none`) and never scroll themselves. In standalone
  mode, iOS lets the *document* scroll/rubber-band if anything is allowed
  to overflow it even slightly (e.g. during the keyboard open/close
  resize), which drags the whole app — header and bottom tab bar included
  — down with it. The fix is that every page's scrollable content area
  uses the `scroll-touch` utility (`src/index.css`: `overflow-y: auto` +
  `-webkit-overflow-scrolling: touch` + `overscroll-behavior: contain`)
  instead of bare `overflow-y-auto`, and `PageHeader`/`BottomTabBar` are
  always plain flex siblings of that scroll region, never inside it. Don't
  add `overflow-y-auto` directly anywhere in a page — use `scroll-touch`.

## Rest Timer

Per-exercise rest between sets, auto-started when a set is marked complete.

- **`RoutineExercise.restTimerSeconds`** holds it, seeded from
  `defaultRestSecondsFor()` (`src/lib/restTimer.ts`) when an exercise is
  added to a routine and editable per row in the routine editor. It's
  optional and **non-indexed inside the embedded `exercises` array, so it
  needed no Dexie `version()` bump** — every read site resolves
  `restTimerSeconds ?? defaultRestSecondsFor(exercise)`, so routines saved
  before the field existed pick up a sensible default with no migration
  (same approach as `SetLog.touched`). An explicit `0` means "no timer for
  this exercise" and survives that `??` intact.
- **`isCompound()` is a heuristic, deliberately.** It reads "does a second
  joint move?" off the seed data's own tagging convention — 2+ synergists,
  or a torso prime mover with an arm synergist, or a leg prime mover with
  another leg synergist — rather than maintaining a list of 150 names.
  Counting synergists alone is *not* enough; that put every row, pulldown
  and hack squat on an isolation rest. It still misjudges a few, which is
  fine: it only picks the default, and the routine editor is where a
  disagreement gets settled.
- **The running timer lives in the `settings` table**, key `restTimer`, as
  an **end timestamp** — not a countdown. This is not the "ephemeral UI
  state" that belongs in `useState`: it has to survive the process. iOS
  freezes a backgrounded web app's JS, so a countdown held in memory comes
  back frozen at whatever it read when the screen locked. Deriving the
  remaining time from `endsAt` against the wall clock on every render means
  a return from suspension shows the *true* elapsed rest, including
  overtime, with no recovery logic. It's in Dexie rather than
  `localStorage` because both `ActiveWorkoutPage` and the cross-tab
  `ActiveWorkoutBanner` render it, and `useLiveQuery` is how this app
  shares state.
- **`RestTimerController` is mounted exactly once**, in `AppShell`. It owns
  the wake lock, the alarm and the flash — the three things that must
  happen once per timer, not once per component showing it. The countdown
  readouts (`RestTimerBar`, `ActiveWorkoutBanner`, both via
  `RestCountdown`) are pure display and can be mounted anywhere.
  Correspondingly `useWakeLockHolder` has exactly one caller and everything
  else reads `useWakeLockHeld()`.

### The ceiling — say it, don't paper over it

**If the phone locks or the app is backgrounded, nothing in this PWA can
alert you.** iOS suspends the JS context, which takes `setTimeout`, Web
Audio and the service worker with it. This is a platform limit, and every
workaround was checked before settling here:

- **`registration.showNotification()` scheduled with `setTimeout`** — the
  timer never fires while suspended. The notification would land when you
  next open the app, which is worse than useless.
- **Notification Triggers** (`showTrigger` / `TimestampTrigger`), which
  would hand the schedule to the browser — never shipped past a Chrome
  origin trial, doesn't exist in Safari.
- **Real Web Push** does wake the service worker while locked, and a web
  app's notifications do mirror to a paired Apple Watch with a haptic. It
  needs a server. This app has no backend and isn't getting one.
- **Audio as a fallback** — Web Audio is suspended on lock too, and the
  "silent looping track keeps the page alive" trick is broken on current
  Safari. The alarm is also inaudible with the ring switch on silent, which
  is why the visual flash is a peer of the sound, not a nicety.

So the design is wake lock + visible countdown + audible alarm + flash, and
**`RestTimerBar` states plainly when the wake lock isn't held** rather than
letting a timer look like it's running when it will die on lock. Screen
Wake Lock needs **iOS 18.4+** in home-screen web apps (WebKit bug 254545 —
the API shipped in 16.4 but was broken in installed PWAs until 18.4).
`useWakeLock.ts` reports `held`, not just `supported`, because on a pre-18.4
device the API exists and the request rejects.

If you're tempted to add a "notify me when resting" toggle: re-read this
section first. It will silently no-op exactly when it matters.

## Folder Structure

```
src/
  db/            Dexie schema, types, seed data, seeding logic
  features/      one folder per feature area (exercises, workout, routines,
                 history, analytics, settings) — page components +
                 feature-local hooks/subcomponents live together
  components/
    layout/      app shell chrome (bottom tab bar, page header)
    ui/          generic reusable primitives (button, input, sheet, stepper,
                 card, chip, textarea)
  hooks/         cross-cutting hooks not tied to one feature (usePRProgression,
                 useLastSessionSet, useSettings, ...)
  lib/           pure helper functions (units, ids, dates, analytics,
                 muscleColors, chartTheme)
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

## Storage & Backups

**Removing the home screen icon deletes the database.** Confirmed on device:
deleting the installed web app and re-adding it wiped IndexedDB completely.
The icon is not a shortcut to a website — it *is* the storage container, and
its site data goes with it. Persistent storage does not protect against this;
`navigator.storage.persist()` only stops the OS evicting data under pressure,
it has no say in an uninstall the user asked for.

This matters because deleting and re-adding the icon is the only way to make
iOS pick up a changed web app manifest (it caches the manifest at install
time), so it is a genuinely tempting thing to do while debugging. **Export
first, every time.** The JSON export in Settings is the only recovery path
that exists — no cloud copy, no backup, and iCloud device backups do not
reliably carry a web app's IndexedDB. A wipe with no recent export is
permanent, total data loss.

There's no cloud sync, so IndexedDB eviction is real data loss — these two
mechanisms exist to reduce that risk:

- **Persistent storage request** (`src/lib/storage.ts`,
  `requestPersistentStorageIfNeeded`): calls `navigator.storage.persist()`
  once, on first launch only, gated on the `persistentStorageRequested`
  settings flag so it never re-requests on later launches. The Settings
  page shows the *current* status via a live `navigator.storage.persisted()`
  check (`usePersistentStorageStatus` in `hooks/useSettings.ts`), not the
  historical request result — the OS can grant persistence later (e.g.
  once the PWA is actually added to the home screen), so the displayed
  status should always reflect what's true right now.
- **Last-exported nudge**: every successful export writes a
  `lastExportedAt` timestamp to `settings` (`recordExportTimestamp` in
  `dataTransfer.ts`). Settings shows a gentle (non-blocking) reminder if
  it's been more than `EXPORT_NUDGE_THRESHOLD_DAYS` (30) since the last
  export, or if there's never been one — see `SettingsPage.tsx`. This is
  advisory only; never block or gate app usage on it.
