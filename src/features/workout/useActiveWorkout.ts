import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Exercise, SetLog, SetType, Workout, WorkoutExercise } from '../../db/types'
import { newId } from '../../lib/ids'

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise | undefined
  sets: SetLog[]
}

/** The in-progress workout, derived as the (at most one) workout with no finishedAt. */
export function useActiveWorkout(): Workout | null | undefined {
  return useLiveQuery(async () => {
    const active = await db.workouts.filter((w) => w.finishedAt === undefined).toArray()
    return active[0] ?? null
  }, [])
}

export function useWorkoutExercises(workoutId: string | undefined): WorkoutExerciseWithDetails[] | undefined {
  return useLiveQuery(async () => {
    if (!workoutId) return []
    const workoutExercises = await db.workoutExercises
      .where('workoutId')
      .equals(workoutId)
      .sortBy('order')

    return Promise.all(
      workoutExercises.map(async (we) => {
        const [exercise, sets] = await Promise.all([
          db.exercises.get(we.exerciseId),
          db.setLogs.where('workoutExerciseId').equals(we.id).sortBy('setNumber'),
        ])
        return { ...we, exercise, sets }
      }),
    )
  }, [workoutId])
}

export async function startWorkout(routineId?: string, routineName?: string): Promise<string> {
  const id = newId()
  await db.workouts.add({ id, routineId, routineName, startedAt: Date.now(), finishedAt: undefined, notes: '' })
  return id
}

/**
 * Starts a workout from a routine: creates the Workout with routineId set
 * (plus a routineName snapshot — see Workout.routineName in db/types.ts, so
 * deleting this routine later can't make this workout revert to
 * "Freeform" in History), adds each routine exercise in order, then
 * pre-populates each with targetSets empty rows (via the same addSet used
 * by "+ Add Set" — see its touched-inheritance comment for why this loop
 * naturally leaves every pre-populated set untouched/placeholder-eligible
 * with no special-casing).
 */
export async function startWorkoutFromRoutine(routineId: string): Promise<string> {
  const routine = await db.routines.get(routineId)
  if (!routine) throw new Error('Routine not found')

  const workoutId = await startWorkout(routineId, routine.name)
  for (const routineExercise of routine.exercises) {
    const workoutExerciseId = await addExerciseToWorkout(workoutId, routineExercise.exerciseId)
    for (let i = 0; i < routineExercise.targetSets; i++) {
      await addSet(workoutExerciseId)
    }
  }
  return workoutId
}

export async function finishWorkout(workoutId: string): Promise<void> {
  await db.workouts.update(workoutId, { finishedAt: Date.now() })
}

/** Deletes an abandoned workout entirely (workout + its exercises + their sets), not a soft-finish. */
export async function discardWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.setLogs, async () => {
    const workoutExercises = await db.workoutExercises.where('workoutId').equals(workoutId).toArray()
    const workoutExerciseIds = workoutExercises.map((we) => we.id)
    await db.setLogs.where('workoutId').equals(workoutId).delete()
    await db.workoutExercises.bulkDelete(workoutExerciseIds)
    await db.workouts.delete(workoutId)
  })
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<string> {
  const existingCount = await db.workoutExercises.where('workoutId').equals(workoutId).count()
  const id = newId()
  await db.workoutExercises.add({
    id,
    workoutId,
    exerciseId,
    order: existingCount,
  })
  return id
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.setLogs, async () => {
    await db.setLogs.where('workoutExerciseId').equals(workoutExerciseId).delete()
    await db.workoutExercises.delete(workoutExerciseId)
  })
}

export async function addSet(workoutExerciseId: string): Promise<void> {
  const workoutExercise = await db.workoutExercises.get(workoutExerciseId)
  if (!workoutExercise) return

  const existing = await db.setLogs
    .where('workoutExerciseId')
    .equals(workoutExerciseId)
    .sortBy('setNumber')
  const last = existing[existing.length - 1]

  await db.setLogs.add({
    id: newId(),
    workoutExerciseId,
    exerciseId: workoutExercise.exerciseId,
    workoutId: workoutExercise.workoutId,
    setNumber: existing.length + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 0,
    type: 'normal' as SetType,
    completed: false,
    timestamp: Date.now(),
    // A truly first set (no `last`) is untouched. A set carrying forward an
    // already-touched value inherits touched:true immediately (it already
    // shows a real number, no placeholder needed). Sets created back-to-back
    // with nothing real yet (e.g. startWorkoutFromRoutine's pre-populate
    // loop) chain `last?.touched ?? false` through and all stay untouched —
    // see CLAUDE.md "Active Workout" for why this needs no special-casing.
    touched: last?.touched ?? false,
  })
}

export async function updateSet(setId: string, changes: Partial<SetLog>): Promise<void> {
  const touched =
    'weightKg' in changes || 'reps' in changes || changes.completed === true ? true : undefined
  await db.setLogs.update(setId, touched ? { ...changes, touched } : changes)
}

/**
 * Only ever rewrites `setNumber` on survivors to close the numbering gap —
 * never `weightKg`/`reps`/`touched`. Each surviving row's `touched` value
 * was fixed once, at that row's own creation, and doesn't depend on which
 * other rows still exist, so deleting a set (touched or not) can't desync a
 * survivor's placeholder state from what it displays.
 */
export async function deleteSet(setId: string, workoutExerciseId: string): Promise<void> {
  await db.transaction('rw', db.setLogs, async () => {
    await db.setLogs.delete(setId)
    const remaining = await db.setLogs
      .where('workoutExerciseId')
      .equals(workoutExerciseId)
      .sortBy('setNumber')
    await Promise.all(
      remaining.map((set, index) =>
        set.setNumber === index + 1 ? Promise.resolve() : db.setLogs.update(set.id, { setNumber: index + 1 }),
      ),
    )
  })
}
