import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Exercise, SetLog, Workout } from '../../db/types'

export interface AnalyticsData {
  setLogs: SetLog[]
  workouts: Workout[]
  exercises: Exercise[]
  exerciseById: Map<string, Exercise>
}

/** Single shared query for the Analytics tab — every chart reads from this instead of running its own live query. */
export function useAnalyticsData(): AnalyticsData | undefined {
  return useLiveQuery(async () => {
    const [setLogs, workouts, exercises] = await Promise.all([
      db.setLogs.toArray(),
      db.workouts.toArray(),
      db.exercises.toArray(),
    ])
    return {
      setLogs,
      workouts,
      exercises,
      exerciseById: new Map(exercises.map((exercise) => [exercise.id, exercise])),
    }
  }, [])
}
