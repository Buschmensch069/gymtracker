import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Workout } from '../../db/types'

export function useFinishedWorkouts(): Workout[] | undefined {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.filter((w) => w.finishedAt !== undefined).toArray()
    return workouts.sort((a, b) => b.startedAt - a.startedAt)
  }, [])
}

export function useWorkout(id: string | undefined): Workout | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    return db.workouts.get(id)
  }, [id])
}
