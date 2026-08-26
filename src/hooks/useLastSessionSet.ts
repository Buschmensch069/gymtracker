import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { isWorkingSet } from '../lib/analytics'

export interface LastSessionSet {
  weightKg: number
  reps: number
}

/** Most recent working set logged for `exerciseId` in a different workout — used as SetLogRow's greyed placeholder. */
export function useLastSessionSet(
  exerciseId: string | undefined,
  currentWorkoutId: string | undefined,
): LastSessionSet | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return undefined
    const sets = await db.setLogs.where('exerciseId').equals(exerciseId).sortBy('timestamp')
    for (let i = sets.length - 1; i >= 0; i--) {
      const set = sets[i]
      if (set.workoutId !== currentWorkoutId && isWorkingSet(set)) {
        return { weightKg: set.weightKg, reps: set.reps }
      }
    }
    return undefined
  }, [exerciseId, currentWorkoutId])
}
