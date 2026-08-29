import type { Exercise, Routine, RoutineExercise, SetLog } from '../../db/types'
import { defaultRestSecondsFor } from '../../lib/restTimer'
import { DEFAULT_REP_RANGE } from '../routines/useRoutines'
import type { WorkoutExerciseWithDetails } from './useActiveWorkout'

export interface RoutineSetChange {
  exerciseName: string
  from: number
  to: number
}

/** What a routine would become if it were rewritten to match the session just finished. */
export interface RoutineUpdatePlan {
  routineId: string
  routineName: string
  /** The proposed replacement for `Routine.exercises` — write this verbatim. */
  exercises: RoutineExercise[]
  addedNames: string[]
  removedNames: string[]
  setChanges: RoutineSetChange[]
  orderChanged: boolean
}

/**
 * How many sets of this exercise the session actually did, in the sense a
 * routine's `targetSets` means it.
 *
 * Warmups are excluded for the same reason `computeTonnage` excludes them
 * (see lib/analytics.ts): a routine's target is working sets, and
 * `startWorkoutFromRoutine` only ever pre-populates plain `normal` rows.
 *
 * Untouched, uncompleted rows are excluded too — those are the pre-populated
 * rows for sets that were planned and never done, and counting them would
 * make "I stopped two sets early" indistinguishable from "I did the plan".
 * `completed || touched` catches both ways a set gets logged: ticking it, and
 * typing a weight/reps into it. `touched` is missing on rows predating the
 * field and those are real logged data, hence `?? true` (see SetLog.touched).
 */
export function performedSetCount(sets: SetLog[]): number {
  return sets.filter((set) => set.type !== 'warmup' && (set.completed || (set.touched ?? true))).length
}

/**
 * Diffs what was actually done against the routine the workout was started
 * from, and returns the routine rewrite that would make them match — or `null`
 * when there is nothing to ask about.
 *
 * Only exercises, their order and their set counts are in scope.
 * `targetRepRange` and `restTimerSeconds` are carried over untouched from the
 * routine's existing entry: they are deliberate settings, not observations of
 * one session (a session doesn't even record a rep *range*). Weights were
 * never in the routine at all.
 *
 * Returns `null` — i.e. don't prompt — when:
 * - the workout wasn't started from a routine, or that routine is gone;
 * - nothing differs;
 * - the session performed no sets at all. That last one is the guard against
 *   proposing to empty a routine: a workout abandoned before anything was
 *   logged says nothing about what the routine should be.
 *
 * An exercise that appears twice in one session (added again later on) is
 * merged into one routine entry at its first position with the set counts
 * summed, because routine exercises are keyed by `exerciseId` — the editor
 * uses it as the drag id and refuses to add a duplicate.
 */
export function planRoutineUpdate(
  routine: Routine | undefined,
  workoutExercises: WorkoutExerciseWithDetails[],
  exerciseById: Map<string, Exercise>,
): RoutineUpdatePlan | null {
  if (!routine) return null

  const performed = new Map<string, number>()
  for (const workoutExercise of workoutExercises) {
    const count = performedSetCount(workoutExercise.sets)
    if (count === 0) continue
    performed.set(workoutExercise.exerciseId, (performed.get(workoutExercise.exerciseId) ?? 0) + count)
  }
  if (performed.size === 0) return null

  const existingById = new Map(routine.exercises.map((re) => [re.exerciseId, re]))
  const exercises: RoutineExercise[] = [...performed].map(([exerciseId, targetSets]) => {
    const existing = existingById.get(exerciseId)
    if (existing) return { ...existing, targetSets }
    return {
      exerciseId,
      targetSets,
      targetRepRange: DEFAULT_REP_RANGE,
      restTimerSeconds: defaultRestSecondsFor(exerciseById.get(exerciseId)),
    }
  })

  const nameOf = (exerciseId: string) => exerciseById.get(exerciseId)?.name ?? 'Exercise'
  const proposedIds = new Set(exercises.map((re) => re.exerciseId))

  const addedNames = exercises
    .filter((re) => !existingById.has(re.exerciseId))
    .map((re) => nameOf(re.exerciseId))
  const removedNames = routine.exercises
    .filter((re) => !proposedIds.has(re.exerciseId))
    .map((re) => nameOf(re.exerciseId))
  const setChanges = exercises.flatMap((re) => {
    const existing = existingById.get(re.exerciseId)
    if (!existing || existing.targetSets === re.targetSets) return []
    return [{ exerciseName: nameOf(re.exerciseId), from: existing.targetSets, to: re.targetSets }]
  })

  // Order is compared over the exercises the two lists have in common —
  // otherwise every add or removal would also report "order changed", which is
  // true but says nothing the added/removed lines didn't already.
  const orderBefore = routine.exercises
    .filter((re) => proposedIds.has(re.exerciseId))
    .map((re) => re.exerciseId)
  const orderAfter = exercises
    .filter((re) => existingById.has(re.exerciseId))
    .map((re) => re.exerciseId)
  const orderChanged = orderBefore.join('\u0000') !== orderAfter.join('\u0000')

  if (!addedNames.length && !removedNames.length && !setChanges.length && !orderChanged) return null

  return {
    routineId: routine.id,
    routineName: routine.name,
    exercises,
    addedNames,
    removedNames,
    setChanges,
    orderChanged,
  }
}
