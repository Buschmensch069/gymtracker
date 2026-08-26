import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, Routine, Workout, WorkoutExercise, SetLog, Setting } from './types'

export class GymTrackerDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('gymtracker')

    this.version(1).stores({
      exercises: 'id, name, primaryMuscle, *secondaryMuscles, equipment',
      routines: 'id, name',
      workouts: 'id, routineId, startedAt, finishedAt',
      workoutExercises: 'id, workoutId, exerciseId, order',
      setLogs: 'id, workoutExerciseId, setNumber, timestamp',
      settings: 'key',
    })

    // v2: denormalize exerciseId/workoutId onto setLogs (see CLAUDE.md
    // "Denormalized fields on SetLog") and backfill existing rows by looking
    // up their parent workoutExercise. Only tables whose schema actually
    // changed need to be listed here — Dexie carries the rest forward from
    // v1 unchanged.
    this.version(2)
      .stores({
        setLogs: 'id, workoutExerciseId, exerciseId, workoutId, setNumber, timestamp',
      })
      .upgrade(async (tx) => {
        const workoutExercises = await tx.table('workoutExercises').toArray()
        const workoutExerciseById = new Map(workoutExercises.map((we) => [we.id, we]))

        await tx
          .table('setLogs')
          .toCollection()
          .modify((setLog) => {
            const parent = workoutExerciseById.get(setLog.workoutExerciseId)
            if (parent) {
              setLog.exerciseId = parent.exerciseId
              setLog.workoutId = parent.workoutId
            }
          })
      })
  }
}

export const db = new GymTrackerDB()
export const ALL_TABLES = [
  'exercises',
  'routines',
  'workouts',
  'workoutExercises',
  'setLogs',
  'settings',
] as const
