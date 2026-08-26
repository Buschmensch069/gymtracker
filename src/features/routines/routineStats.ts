import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Exercise, PrimaryMuscle, Routine } from '../../db/types'

/** Most recent finished-workout start time for this routine, or undefined if never performed. */
export function useRoutineLastPerformed(routineId: string): number | undefined {
  return useLiveQuery(async () => {
    const workouts = await db.workouts.where('routineId').equals(routineId).toArray()
    const finished = workouts.filter((w) => w.finishedAt !== undefined)
    if (finished.length === 0) return undefined
    return Math.max(...finished.map((w) => w.startedAt))
  }, [routineId])
}

/** Distinct primary muscles covered by a routine's exercises, in routine-exercise order. */
export function musclesForRoutine(routine: Routine, exerciseById: Map<string, Exercise>): PrimaryMuscle[] {
  const seen = new Set<PrimaryMuscle>()
  const result: PrimaryMuscle[] = []
  for (const { exerciseId } of routine.exercises) {
    const muscle = exerciseById.get(exerciseId)?.primaryMuscle
    if (muscle && !seen.has(muscle)) {
      seen.add(muscle)
      result.push(muscle)
    }
  }
  return result
}
