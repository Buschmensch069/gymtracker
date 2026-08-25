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
