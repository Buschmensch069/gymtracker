import { db, ALL_TABLES } from '../../db/schema'
import type { Exercise, Routine, SetLog, Setting, Workout, WorkoutExercise } from '../../db/types'

/**
 * Export-file format version. Separate from the Dexie schema version (see
 * CLAUDE.md) — the two don't move in lockstep.
 *
 * v2 adds RoutineExercise.restTimerSeconds.
 */
const SCHEMA_VERSION = 2

/**
 * Older formats we can still read. Import is this app's only backup mechanism
 * and there's no cloud copy, so rejecting a file someone exported last month
 * would be data loss by pedantry — v1 files are accepted and upgraded on the
 * way in (see upgradeExport). Only add a version here if it can actually be
 * migrated forward.
 */
const IMPORTABLE_SCHEMA_VERSIONS = [1, SCHEMA_VERSION]

interface GymTrackerExport {
  schemaVersion: number
  exportedAt: string
  data: {
    exercises: Exercise[]
    routines: Routine[]
    workouts: Workout[]
    workoutExercises: WorkoutExercise[]
    setLogs: SetLog[]
    settings: Setting[]
  }
}

export async function exportAllData(): Promise<GymTrackerExport> {
  return db.transaction('r', db.tables, async () => {
    const [exercises, routines, workouts, workoutExercises, setLogs, settings] = await Promise.all([
      db.exercises.toArray(),
      db.routines.toArray(),
      db.workouts.toArray(),
      db.workoutExercises.toArray(),
      db.setLogs.toArray(),
      db.settings.toArray(),
    ])
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: { exercises, routines, workouts, workoutExercises, setLogs, settings },
    }
  })
}

export function downloadExport(payload: GymTrackerExport): void {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStamp = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `gymtracker-export-${dateStamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function recordExportTimestamp(): Promise<void> {
  await db.settings.put({ key: 'lastExportedAt', value: Date.now() })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function validateExport(raw: unknown): GymTrackerExport {
  if (!isRecord(raw)) throw new Error('File is not a valid export.')
  if (typeof raw.schemaVersion !== 'number' || !IMPORTABLE_SCHEMA_VERSIONS.includes(raw.schemaVersion)) {
    throw new Error('Export file format is outdated or unrecognized. Please re-export.')
  }
  if (!isRecord(raw.data)) throw new Error('File is missing its data section.')

  for (const table of ALL_TABLES) {
    if (!Array.isArray(raw.data[table])) {
      throw new Error(`File is missing the "${table}" table.`)
    }
  }

  return raw as unknown as GymTrackerExport
}

/**
 * Bring an accepted older export up to the current shape. v1 files predate
 * RoutineExercise.restTimerSeconds; it's left undefined rather than filled in
 * with a guess, because every read site already resolves undefined to the
 * compound/isolation default for that exercise — which is a better answer than
 * a value baked in at import time from an exercise row that might since have
 * been edited.
 */
function upgradeExport(payload: GymTrackerExport): GymTrackerExport {
  return { ...payload, schemaVersion: SCHEMA_VERSION }
}

export async function importAllData(rawPayload: GymTrackerExport): Promise<void> {
  const payload = upgradeExport(rawPayload)

  // Backfill Workout.routineName from this same payload's routines for any
  // imported workout that has a routineId but no snapshot yet — e.g. an
  // older export file taken before this field existed, or a hand-built
  // import. Without this, deleting that routine later would revert the
  // workout to "Freeform" in History with no way to recover the name (the
  // v3 schema migration only backfills rows already in the live DB at the
  // moment of that one-time version upgrade — it never runs again for data
  // bulk-added by a later import, which is a separate write path).
  const routineNameById = new Map(payload.data.routines.map((r) => [r.id, r.name]))
  const workouts = payload.data.workouts.map((workout) =>
    workout.routineId && !workout.routineName
      ? { ...workout, routineName: routineNameById.get(workout.routineId) ?? workout.routineName }
      : workout,
  )

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await Promise.all([
      db.exercises.bulkAdd(payload.data.exercises),
      db.routines.bulkAdd(payload.data.routines),
      db.workouts.bulkAdd(workouts),
      db.workoutExercises.bulkAdd(payload.data.workoutExercises),
      db.setLogs.bulkAdd(payload.data.setLogs),
      db.settings.bulkAdd(payload.data.settings),
    ])
  })
}

export function countRecords(payload: GymTrackerExport): number {
  return Object.values(payload.data).reduce((sum, rows) => sum + rows.length, 0)
}
