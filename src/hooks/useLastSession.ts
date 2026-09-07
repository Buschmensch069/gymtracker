import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { SetLog } from '../db/types'
import { computeTonnage, isWorkingSet } from '../lib/analytics'

export interface LastSessionSet {
  weightKg: number
  reps: number
}

export interface LastSession {
  workoutId: string
  /** When that session's last working set of this exercise was logged. */
  performedAt: number
  /**
   * Its working sets, in performed order (`setNumber`). Index `n` is the set
   * the active workout's (n+1)th working set is compared against.
   */
  sets: SetLog[]
  /** Tonnage over those sets — the baseline for the exercise heading's comparison. */
  volumeKg: number
  /** The final working set, shown as the greyed placeholder on an untouched row. */
  lastSet: LastSessionSet
}

/**
 * The previous session's work on one exercise: every working set it logged,
 * in order, plus its volume.
 *
 * "Previous session" is the most recent *other* workout containing a working
 * set of this exercise — not necessarily a finished one, and not necessarily
 * the immediately preceding workout, which may not have included the movement
 * at all.
 *
 * Called once per exercise block and handed down to the set rows, rather than
 * once per row: every row of a block wants the same answer, and this is a
 * live query, so per-row would re-run the same three table reads for each set
 * on screen.
 *
 * An exercise logged twice in one session (two blocks — possible for imported
 * workouts, see `ExerciseLineData.workoutExerciseId`) is treated as one piece
 * of work here. That's right for the volume comparison, and the set-by-set
 * alignment degrades gracefully: the sets simply queue up in `setNumber`
 * order.
 */
export function useLastSession(
  exerciseId: string | undefined,
  currentWorkoutId: string | undefined,
): LastSession | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return undefined
    const all = await db.setLogs.where('exerciseId').equals(exerciseId).sortBy('timestamp')

    // Walked newest-first: the first working set belonging to another workout
    // identifies the session, and is also the value the placeholder shows.
    let session: SetLog | undefined
    for (let i = all.length - 1; i >= 0; i--) {
      const set = all[i]
      if (set.workoutId !== currentWorkoutId && isWorkingSet(set)) {
        session = set
        break
      }
    }
    if (!session) return undefined

    const sets = all
      .filter((set) => set.workoutId === session.workoutId && isWorkingSet(set))
      .sort((a, b) => a.setNumber - b.setNumber)

    return {
      workoutId: session.workoutId,
      performedAt: session.timestamp,
      sets,
      volumeKg: computeTonnage(sets),
      lastSet: { weightKg: session.weightKg, reps: session.reps },
    }
  }, [exerciseId, currentWorkoutId])
}
