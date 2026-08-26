import { db, ALL_TABLES } from '../../db/schema'
import type { Exercise, Routine, SetLog, Setting, Workout, WorkoutExercise } from '../../db/types'

const SCHEMA_VERSION = 1

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
  if (raw.schemaVersion !== SCHEMA_VERSION) {
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

export async function importAllData(payload: GymTrackerExport): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await Promise.all([
      db.exercises.bulkAdd(payload.data.exercises),
      db.routines.bulkAdd(payload.data.routines),
      db.workouts.bulkAdd(payload.data.workouts),
      db.workoutExercises.bulkAdd(payload.data.workoutExercises),
      db.setLogs.bulkAdd(payload.data.setLogs),
      db.settings.bulkAdd(payload.data.settings),
    ])
  })
}

export function countRecords(payload: GymTrackerExport): number {
  return Object.values(payload.data).reduce((sum, rows) => sum + rows.length, 0)
}
