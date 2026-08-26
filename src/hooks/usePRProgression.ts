import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { computePRProgression, type PRProgression } from '../lib/analytics'

/**
 * Shared PR-detection hook — wraps computePRProgression (see lib/analytics.ts)
 * over every SetLog in the database. Used by History cards, WorkoutDetailPage,
 * and the Analytics PR List so all three agree on what counts as a PR.
 */
export function usePRProgression(): PRProgression | undefined {
  return useLiveQuery(async () => {
    const [setLogs, exercises] = await Promise.all([db.setLogs.toArray(), db.exercises.toArray()])
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
    return computePRProgression(setLogs, exerciseById)
  }, [])
}
