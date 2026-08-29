import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Routine, RoutineExercise } from '../../db/types'
import { newId } from '../../lib/ids'

/**
 * Defaults for an exercise newly added to a routine. Shared, not local to the
 * routine editor: the "update routine on finish" flow
 * (features/workout/routineUpdate.ts) adds exercises to a routine too, and an
 * exercise added that way should be indistinguishable from one added by hand.
 */
export const DEFAULT_TARGET_SETS = 3
export const DEFAULT_REP_RANGE = '8-12'

export function useRoutineList(): Routine[] | undefined {
  return useLiveQuery(async () => {
    const routines = await db.routines.toArray()
    return routines.sort((a, b) => a.name.localeCompare(b.name))
  }, [])
}

export function useRoutine(id: string | undefined): Routine | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    return db.routines.get(id)
  }, [id])
}

export async function createRoutine(name: string, exercises: RoutineExercise[]): Promise<string> {
  const id = newId()
  await db.routines.add({ id, name, exercises })
  return id
}

export async function updateRoutine(id: string, changes: Partial<Routine>): Promise<void> {
  await db.routines.update(id, changes)
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}
