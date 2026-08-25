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

export async function startWorkout(): Promise<string> {
  const id = newId()
  await db.workouts.add({ id, startedAt: Date.now(), finishedAt: undefined, notes: '' })
  return id
}

export async function finishWorkout(workoutId: string): Promise<void> {
  await db.workouts.update(workoutId, { finishedAt: Date.now() })
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<void> {
  const existingCount = await db.workoutExercises.where('workoutId').equals(workoutId).count()
  await db.workoutExercises.add({
    id: newId(),
    workoutId,
    exerciseId,
    order: existingCount,
  })
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.setLogs, async () => {
    await db.setLogs.where('workoutExerciseId').equals(workoutExerciseId).delete()
    await db.workoutExercises.delete(workoutExerciseId)
  })
}

export async function addSet(workoutExerciseId: string): Promise<void> {
  const existing = await db.setLogs
    .where('workoutExerciseId')
    .equals(workoutExerciseId)
    .sortBy('setNumber')
  const last = existing[existing.length - 1]

  await db.setLogs.add({
    id: newId(),
    workoutExerciseId,
    setNumber: existing.length + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 0,
    type: 'normal' as SetType,
    completed: false,
    timestamp: Date.now(),
  })
}

export async function updateSet(setId: string, changes: Partial<SetLog>): Promise<void> {
  await db.setLogs.update(setId, changes)
}

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
