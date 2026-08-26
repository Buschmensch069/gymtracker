#!/usr/bin/env node
/**
 * One-off Hevy CSV -> Gym Tracker export-JSON converter.
 *
 * NOT part of the app bundle (lives in scripts/, not src/). Run with Node
 * directly:
 *
 *   node scripts/hevy-import.mjs                 # dry run: prints the
 *                                                  # exercise-match review
 *                                                  # table + summary, writes
 *                                                  # nothing
 *   node scripts/hevy-import.mjs --write          # also writes the import
 *                                                  # JSON file
 *
 * Optional flags: --csv <path> (default ./workout_data.csv)
 *                  --out <path> (default ./hevy-import-output.json)
 *
 * The output JSON matches the GymTrackerExport shape read by
 * validateExport()/importAllData() in src/features/settings/dataTransfer.ts
 * (schemaVersion: 1). Import that file from the app's Settings page.
 *
 * IMPORTANT: importAllData() does a hard replace, not a merge — it clears
 * every table before inserting. See the printed summary for what that means
 * for this specific run.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const csvArgIdx = args.indexOf('--csv')
const outArgIdx = args.indexOf('--out')
const csvPath = csvArgIdx >= 0 ? path.resolve(args[csvArgIdx + 1]) : path.join(repoRoot, 'workout_data.csv')
const outPath = outArgIdx >= 0 ? path.resolve(args[outArgIdx + 1]) : path.join(repoRoot, 'hevy-import-output.json')

// ---------------------------------------------------------------------------
// Seed exercise catalog — reuse the app's actual seed data files (not a
// hand-copied duplicate) so matching runs against exactly what's seeded into
// a fresh DB. Import each leaf module directly by explicit .ts extension
// (Node's native TS type-stripping handles the erasable `import type` /
// type-annotation syntax fine); we can't import seedData/index.ts itself
// because its internal imports omit extensions, which Node's ESM resolver
// requires — so we replicate index.ts's aggregation here instead.
// ---------------------------------------------------------------------------

const seedDataDir = path.join(repoRoot, 'src', 'db', 'seedData')
const seedModuleFiles = {
  chest: 'chestExercises',
  back: 'backExercises',
  shoulders: 'shoulderExercises',
  legs: 'legExercises',
  arms: 'armExercises',
  core: 'coreExercises',
  cardio: 'cardioExercises',
  fullBody: 'fullBodyExercises',
}

function newId() {
  return crypto.randomUUID()
}

async function loadSeedCatalog() {
  const raw = []
  for (const [file, exportName] of Object.entries(seedModuleFiles)) {
    const mod = await import(pathToFileURL(path.join(seedDataDir, `${file}.ts`)).href)
    const list = mod[exportName]
    if (!Array.isArray(list)) throw new Error(`Expected export "${exportName}" in ${file}.ts`)
    raw.push(...list)
  }
  return raw.map((exercise) => ({
    ...exercise,
    id: newId(),
    isCustom: false,
    notes: '',
  }))
}

// ---------------------------------------------------------------------------
// CSV parsing (RFC4180-ish: quoted fields, "" escape, embedded newlines/commas)
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    } else {
      if (c === '"') {
        inQuotes = true
        i++
        continue
      }
      if (c === ',') {
        row.push(field)
        field = ''
        i++
        continue
      }
      if (c === '\r') {
        i++
        continue
      }
      if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i++
        continue
      }
      field += c
      i++
      continue
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Date parsing — "26 Aug 2026, 15:33" local time, no seconds.
// ---------------------------------------------------------------------------

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

function parseHevyDate(str) {
  const m = str.match(/^(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2})$/)
  if (!m) throw new Error(`Unparseable Hevy date: "${str}"`)
  const [, day, monStr, year, hour, min] = m
  const month = MONTHS[monStr]
  if (month === undefined) throw new Error(`Unknown month abbreviation: "${monStr}" in "${str}"`)
  return new Date(Number(year), month, Number(day), Number(hour), Number(min), 0, 0).getTime()
}

// ---------------------------------------------------------------------------
// Exercise-name fuzzy matching
// ---------------------------------------------------------------------------

const EQUIPMENT_PHRASES = [
  [/smith\s*machine/, 'smithMachine'],
  [/machine/, 'machine'],
  [/barbell/, 'barbell'],
  [/dumbbell/, 'dumbbell'],
  [/cable/, 'cable'],
  [/bodyweight/, 'bodyweight'],
  [/kettlebell/, 'kettlebell'],
  [/band/, 'band'],
]

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[-_/'()]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pulls an Equipment guess from anywhere in the name (parenthetical suffix or plain word). */
function extractEquipmentHint(rawName) {
  const scanText = normalize(rawName)
  for (const [re, equip] of EQUIPMENT_PHRASES) {
    if (re.test(scanText)) return equip
  }
  return undefined
}

function singularize(word) {
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

const EQUIPMENT_STEMS = ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'band', 'kettlebell', 'plate']

/**
 * Core name tokens: normalized, singularized, equipment words stripped
 * wherever they appear (parens or not — parens content is otherwise kept,
 * since seed names use it for real disambiguators like "Dips (Triceps
 * Focus)" vs "Dips (Chest Focus)", not just equipment).
 */
function coreTokens(rawName) {
  return normalize(rawName)
    .split(' ')
    .filter(Boolean)
    .map(singularize)
    .filter((w) => !EQUIPMENT_STEMS.some((stem) => w.startsWith(stem)))
}

// Common gym-vocab words that show up across many different exercises/muscle
// groups — a lone match on one of these is weak evidence by itself (e.g.
// "curl" alone doesn't distinguish a bicep curl from a leg curl).
const GENERIC_TOKENS = new Set([
  'curl', 'press', 'row', 'fly', 'extension', 'raise', 'pushdown', 'pulldown',
  'squat', 'dip', 'crunch', 'pull', 'push', 'shrug', 'kickback', 'lunge',
])

function scoreMatch(csvName, seedExercise) {
  const hint = extractEquipmentHint(csvName)
  const a = coreTokens(csvName)
  const b = coreTokens(seedExercise.name)
  const setA = new Set(a)
  const setB = new Set(b)
  const intersectionTokens = [...setA].filter((t) => setB.has(t))
  const intersection = intersectionTokens.length
  const union = new Set([...a, ...b]).size
  const minLen = Math.min(setA.size, setB.size) || 1
  const jaccard = union === 0 ? 0 : intersection / union
  // A match resting on a single shared token is weak evidence when that
  // token is a generic gym-vocab word — damp it so it can't alone carry a
  // match to a high score. A single shared *specific* word (e.g.
  // "treadmill", "romanian") stays undamped.
  const soleGenericOverlap = minLen === 1 && intersection === 1 && GENERIC_TOKENS.has(intersectionTokens[0])
  const containment = (intersection / minLen) * (soleGenericOverlap ? 0.5 : 1)
  let score = 0.5 * jaccard + 0.5 * containment
  if (hint) {
    score += hint === seedExercise.equipment ? 0.15 : -0.15
  }
  return Math.max(0, Math.min(1, score))
}

const MATCH_THRESHOLD = 0.62

function findBestMatch(csvName, catalog) {
  let best = null
  for (const exercise of catalog) {
    const score = scoreMatch(csvName, exercise)
    if (!best || score > best.score) best = { exercise, score }
  }
  return best
}

function confidenceLabel(score) {
  if (score >= 0.8) return 'High'
  if (score >= MATCH_THRESHOLD) return 'Medium'
  return 'Low'
}

// ---------------------------------------------------------------------------
// Custom-exercise inference for unmatched names
// ---------------------------------------------------------------------------

const MUSCLE_KEYWORD_RULES = [
  [/leg curl|hamstring/, 'hamstrings'],
  [/leg extension|quad/, 'quadriceps'],
  [/squat|lunge/, 'quadriceps'],
  [/hip thrust|glute|hip abduction|hip adduction/, 'glutes'],
  [/calf/, 'calves'],
  [/row|pulldown|pull up|pullup|back extension|hyperextension|lat /, 'back'],
  [/bicep|preacher|hammer curl|curl/, 'biceps'],
  [/tricep|pushdown|skull|jm press/, 'triceps'],
  [/reverse fly|rear delt|lateral raise|front raise|face pull|shoulder|shrug|overhead press/, 'shoulders'],
  [/chest|pec deck|fly|bench/, 'chest'],
  [/plank|crunch|sit up|ab wheel|russian twist|core/, 'core'],
  [/treadmill|bike|stair|elliptical|rowing machine|jump rope/, 'cardio'],
  [/dip/, 'chest'],
]

function inferPrimaryMuscle(name) {
  const n = normalize(name)
  for (const [re, muscle] of MUSCLE_KEYWORD_RULES) {
    if (re.test(n)) return muscle
  }
  return 'fullBody'
}

function inferEquipment(name) {
  const hint = extractEquipmentHint(name)
  if (hint) return hint
  const n = normalize(name)
  if (/dip|pull up|push up|plank|sit up/.test(n)) return 'bodyweight'
  return 'other'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const seedCatalog = await loadSeedCatalog()

  const csvText = readFileSync(csvPath, 'utf8')
  const rows = parseCsv(csvText)
  const header = rows[0]
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  const dataRows = rows.slice(1).filter((r) => r.length > 1 || r[0] !== '')

  const REQUIRED_COLS = [
    'title', 'start_time', 'end_time', 'description', 'exercise_title',
    'superset_id', 'exercise_notes', 'set_index', 'set_type', 'weight_kg',
    'reps', 'distance_km', 'duration_seconds', 'rpe',
  ]
  for (const col of REQUIRED_COLS) {
    if (!(col in idx)) throw new Error(`CSV is missing expected column "${col}"`)
  }

  const VALID_SET_TYPES = new Set(['warmup', 'normal', 'dropset', 'failure'])
  for (const r of dataRows) {
    const t = r[idx.set_type]
    if (!VALID_SET_TYPES.has(t)) {
      throw new Error(`Unexpected set_type "${t}" (row exercise: ${r[idx.exercise_title]}). Expected one of: ${[...VALID_SET_TYPES].join(', ')}`)
    }
  }

  // ---- Exercise-name matching (69 distinct exercise_title values) --------

  // Hand-reviewed corrections: the fuzzy matcher deliberately discounts
  // single-generic-word overlaps (e.g. bare "row") to avoid worse false
  // positives elsewhere (see "Rear Delt Reverse Fly" almost matching plain
  // "Cable Fly"), which pushes a few genuine matches into the custom
  // bucket as collateral. Force those here instead of loosening the
  // general scoring and risking new false positives.
  const MANUAL_OVERRIDES = {
    'Bent Over Row (Barbell)': 'Barbell Row', // same lift; keep it merged into one exercise's history
  }

  const distinctExerciseNames = [...new Set(dataRows.map((r) => r[idx.exercise_title]))].sort()
  const matchResults = new Map() // exercise_title -> { kind: 'matched'|'custom', exercise, score? }

  for (const name of distinctExerciseNames) {
    if (name in MANUAL_OVERRIDES) {
      const seedName = MANUAL_OVERRIDES[name]
      const seedMatch = seedCatalog.find((e) => e.name === seedName)
      if (!seedMatch) throw new Error(`Manual override for "${name}" points to unknown seed exercise "${seedName}"`)
      matchResults.set(name, { kind: 'matched', exercise: seedMatch, score: 1, manualOverride: true })
      continue
    }
    const best = findBestMatch(name, seedCatalog)
    if (best && best.score >= MATCH_THRESHOLD) {
      matchResults.set(name, { kind: 'matched', exercise: best.exercise, score: best.score })
    } else {
      const primaryMuscle = inferPrimaryMuscle(name)
      const equipment = inferEquipment(name)
      matchResults.set(name, {
        kind: 'custom',
        exercise: {
          id: newId(),
          name,
          primaryMuscle,
          secondaryMuscles: [],
          equipment,
          isCustom: true,
          notes: '',
        },
        bestScore: best ? best.score : 0,
        bestGuessName: best ? best.exercise.name : null,
      })
    }
  }

  // ---- Print review table BEFORE anything is written ---------------------

  console.log('')
  console.log('=== Exercise match review (all 69 distinct exercise_title values) ===')
  console.log('')
  const matchedRows = []
  const customRows = []
  for (const name of distinctExerciseNames) {
    const result = matchResults.get(name)
    if (result.kind === 'matched') {
      matchedRows.push({
        'Hevy name': name,
        'Matched seed exercise': result.exercise.name,
        Confidence: result.manualOverride ? 'Manual override' : `${confidenceLabel(result.score)} (${result.score.toFixed(2)})`,
        Equipment: result.exercise.equipment,
        Muscle: result.exercise.primaryMuscle,
      })
    } else {
      customRows.push({
        'Hevy name (-> custom)': name,
        'Guessed primaryMuscle': result.exercise.primaryMuscle,
        'Guessed equipment': result.exercise.equipment,
        'Closest seed (rejected)': result.bestGuessName ? `${result.bestGuessName} (${result.bestScore.toFixed(2)})` : '(none)',
      })
    }
  }
  console.table(matchedRows)
  console.log('')
  console.log(`--- Unmatched -> new custom exercises (${customRows.length}) ---`)
  console.log('')
  console.table(customRows)
  console.log('')
  console.log(`Matched: ${matchedRows.length} / ${distinctExerciseNames.length}   Custom (new): ${customRows.length} / ${distinctExerciseNames.length}`)
  console.log(`Match threshold: score >= ${MATCH_THRESHOLD}`)

  // ---- Group CSV rows into workouts by (title, start_time) ---------------

  const workoutGroups = new Map() // key -> { title, startTimeRaw, endTimeRaw, rows: [] }
  for (const r of dataRows) {
    const title = r[idx.title]
    const startRaw = r[idx.start_time]
    const key = `${title} ${startRaw}`
    if (!workoutGroups.has(key)) {
      workoutGroups.set(key, { title, startTimeRaw: startRaw, endTimeRaw: r[idx.end_time], rows: [] })
    }
    const group = workoutGroups.get(key)
    if (group.endTimeRaw !== r[idx.end_time]) {
      console.warn(`WARNING: inconsistent end_time within workout "${title}" @ ${startRaw} — using first-seen value`)
    }
    group.rows.push(r)
  }

  // ---- Dropped-field accounting -------------------------------------------

  let supersetDroppedCount = 0
  let distanceDroppedCount = 0
  let durationDroppedCount = 0
  let exerciseNotesDroppedCount = 0
  const droppedDistanceExercises = new Set()
  const droppedDurationExercises = new Set()

  // ---- Build exercises / routines / workouts / workoutExercises / setLogs -

  const exercisesById = new Map(seedCatalog.map((e) => [e.id, e]))
  for (const result of matchResults.values()) {
    if (result.kind === 'custom') exercisesById.set(result.exercise.id, result.exercise)
  }

  function exerciseForCsvName(name) {
    return matchResults.get(name).exercise
  }

  const routines = new Map() // title -> Routine
  const workouts = []
  const workoutExercises = []
  const setLogs = []

  let totalSets = 0
  let minStarted = Infinity
  let maxStarted = -Infinity
  let zeroOrNegativeDurationWorkouts = 0

  // Sort groups chronologically so routine exercise-order aggregation reads
  // sessions in the order they actually happened.
  const sortedGroups = [...workoutGroups.values()].sort(
    (a, b) => parseHevyDate(a.startTimeRaw) - parseHevyDate(b.startTimeRaw),
  )

  // routine title -> { exerciseOrder: string[] (exerciseId, first-seen order),
  //                     stats: Map<exerciseId, { workingSetCounts: number[], reps: number[] }> }
  const routineAgg = new Map()

  for (const group of sortedGroups) {
    const startedAt = parseHevyDate(group.startTimeRaw)
    const finishedAt = parseHevyDate(group.endTimeRaw)
    if (finishedAt <= startedAt) zeroOrNegativeDurationWorkouts++
    minStarted = Math.min(minStarted, startedAt)
    maxStarted = Math.max(maxStarted, startedAt)

    // Preserve exercise order of first appearance within this workout instance.
    const exerciseOrderInWorkout = []
    const rowsByExercise = new Map()
    for (const r of group.rows) {
      const exName = r[idx.exercise_title]
      if (!rowsByExercise.has(exName)) {
        rowsByExercise.set(exName, [])
        exerciseOrderInWorkout.push(exName)
      }
      rowsByExercise.get(exName).push(r)

      if (r[idx.superset_id]) supersetDroppedCount++
      if (r[idx.exercise_notes]) exerciseNotesDroppedCount++
      const dist = r[idx.distance_km]
      const dur = r[idx.duration_seconds]
      if (dist && Number(dist) !== 0) {
        distanceDroppedCount++
        droppedDistanceExercises.add(exName)
      }
      if (dur && Number(dur) !== 0) {
        durationDroppedCount++
        droppedDurationExercises.add(exName)
      }
    }

    // Routine name/title bucket for aggregation.
    if (!routineAgg.has(group.title)) {
      routineAgg.set(group.title, { exerciseOrder: [], exerciseIdSeen: new Set(), stats: new Map() })
    }
    const agg = routineAgg.get(group.title)

    const workoutId = newId()
    workouts.push({
      id: workoutId,
      routineId: undefined, // filled in after routines are finalized
      startedAt,
      finishedAt,
      notes: '',
      __routineTitle: group.title, // internal, stripped before writing
    })

    // Flatten this workout's rows in (exercise order, then set order) for
    // monotonic timestamp synthesis. set_index is usually a clean 0..k-1
    // sequence per exercise-instance, but ~28 exercise-instances in this
    // export have a repeated set_index for two genuinely different sets
    // (different weight/reps) — a Hevy export quirk, not duplicate rows.
    // Array.prototype.sort is stable, so ties keep file order (chronological
    // performance order), and we number sets by *position*, not by trusting
    // the raw set_index value, so setNumber still comes out as a clean 1..k.
    const orderedRows = []
    const globalIndexByRow = new Map()
    for (const exName of exerciseOrderInWorkout) {
      const exRows = [...rowsByExercise.get(exName)].sort(
        (a, b) => Number(a[idx.set_index]) - Number(b[idx.set_index]),
      )
      for (const r of exRows) {
        globalIndexByRow.set(r, orderedRows.length)
        orderedRows.push(r)
      }
    }
    const n = orderedRows.length
    const span = finishedAt - startedAt

    exerciseOrderInWorkout.forEach((exName, order) => {
      const exercise = exerciseForCsvName(exName)
      const workoutExerciseId = newId()
      workoutExercises.push({ id: workoutExerciseId, workoutId, exerciseId: exercise.id, order })

      if (!agg.exerciseIdSeen.has(exercise.id)) {
        agg.exerciseIdSeen.add(exercise.id)
        agg.exerciseOrder.push(exercise.id)
      }
      if (!agg.stats.has(exercise.id)) agg.stats.set(exercise.id, { workingSetCounts: [], reps: [] })
      const stat = agg.stats.get(exercise.id)
      const exRows = rowsByExercise.get(exName)
      const workingRows = exRows.filter((r) => r[idx.set_type] !== 'warmup')
      stat.workingSetCounts.push(workingRows.length)
      for (const r of workingRows) {
        const reps = Number(r[idx.reps])
        if (Number.isFinite(reps) && reps > 0) stat.reps.push(reps)
      }

      const exRowsSorted = [...exRows].sort((a, b) => Number(a[idx.set_index]) - Number(b[idx.set_index]))
      exRowsSorted.forEach((r, posInExercise) => {
        const globalIndex = globalIndexByRow.get(r)
        const timestamp = span > 0
          ? startedAt + Math.round(((globalIndex + 1) * span) / (n + 1))
          : startedAt + globalIndex * 1000
        const weightKg = r[idx.weight_kg] === '' ? 0 : Number(r[idx.weight_kg])
        const reps = r[idx.reps] === '' ? 0 : Number(r[idx.reps])
        const rpeRaw = r[idx.rpe]
        const setLog = {
          id: newId(),
          workoutExerciseId,
          exerciseId: exercise.id,
          workoutId,
          setNumber: posInExercise + 1,
          weightKg,
          reps,
          type: r[idx.set_type],
          completed: true,
          timestamp,
          touched: true,
        }
        if (rpeRaw !== '') setLog.rpe = Number(rpeRaw)
        setLogs.push(setLog)
        totalSets++
      })
    })
  }

  // ---- Finalize routines (one per distinct workout title) ----------------

  for (const [title, agg] of routineAgg) {
    const routineId = newId()
    const exercises = agg.exerciseOrder.map((exerciseId) => {
      const stat = agg.stats.get(exerciseId)
      const avgSets = stat.workingSetCounts.length
        ? Math.max(1, Math.round(stat.workingSetCounts.reduce((a, b) => a + b, 0) / stat.workingSetCounts.length))
        : 1
      const targetRepRange = stat.reps.length
        ? `${Math.min(...stat.reps)}-${Math.max(...stat.reps)}`
        : '8-12'
      return { exerciseId, targetSets: avgSets, targetRepRange }
    })
    routines.set(title, { id: routineId, name: title, exercises })
  }

  for (const w of workouts) {
    const routine = routines.get(w.__routineTitle)
    w.routineId = routine.id
    w.routineName = routine.name // snapshot, matches Workout.routineName — see CLAUDE.md-equivalent note in db/types.ts
    delete w.__routineTitle
  }

  // ---- Summary -------------------------------------------------------------

  const allExercises = [...exercisesById.values()]
  const customCount = allExercises.filter((e) => e.isCustom).length

  console.log('')
  console.log('=== Dropped fields (no schema home) ===')
  console.log(`superset_id: ${supersetDroppedCount} rows had a value — grouping info dropped (app has no superset concept)`)
  console.log(`exercise_notes: ${exerciseNotesDroppedCount} rows had a value — dropped (no per-set notes field; SetLog has no notes, Exercise.notes is exercise-level not per-workout)`)
  console.log(`distance_km: ${distanceDroppedCount} rows had a nonzero value — dropped. Exercises affected: ${[...droppedDistanceExercises].join(', ') || '(none)'}`)
  console.log(`duration_seconds: ${durationDroppedCount} rows had a nonzero value — dropped. Exercises affected: ${[...droppedDurationExercises].join(', ') || '(none)'}`)
  console.log(`  (these sets still import with weightKg/reps as recorded — for Treadmill/Stair Machine/Plank rows reps and weight are 0, so those particular sets carry essentially no performance data after import)`)

  console.log('')
  console.log('=== Summary ===')
  console.log(`Workouts: ${workouts.length}`)
  console.log(`Sets: ${totalSets}`)
  console.log(`WorkoutExercises: ${workoutExercises.length}`)
  console.log(`Routines created (one per distinct workout title): ${routines.size}`)
  console.log(`Exercises in output: ${allExercises.length} total (${allExercises.length - customCount} from seed catalog, ${customCount} new custom)`)
  console.log(`Date range: ${new Date(minStarted).toISOString()} .. ${new Date(maxStarted).toISOString()}`)
  if (zeroOrNegativeDurationWorkouts > 0) {
    console.log(`WARNING: ${zeroOrNegativeDurationWorkouts} workout(s) had end_time <= start_time — timestamps for those fell back to 1s increments from start_time`)
  }

  if (!WRITE) {
    console.log('')
    console.log('Dry run only — no file written. Re-run with --write once the review above looks right.')
    return
  }

  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: allExercises,
      routines: [...routines.values()],
      workouts,
      workoutExercises,
      setLogs,
      settings: [
        { key: 'unitPreference', value: 'kg' },
        { key: 'seedVersion', value: 1 },
      ],
    },
  }

  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log('')
  console.log(`Wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
