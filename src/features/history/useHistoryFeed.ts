import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { SetLog, Workout, WorkoutExercise } from '../../db/types'
import { computePRProgression } from '../../lib/analytics'
import { formatMonthLabel, startOfMonth } from '../../lib/dates'
import { computeWorkoutSummary, type WorkoutSummary } from './workoutStats'

export interface HistoryWorkoutEntry {
  workout: Workout
  routineName: string | null
  summary: WorkoutSummary
  prCount: number
}

export interface HistoryMonthGroup {
  monthStart: number
  label: string
  entries: HistoryWorkoutEntry[]
}

/**
 * Single aggregating query for the whole History feed — loads every
 * finished workout plus all workoutExercises/setLogs/exercises/routines in
 * one pass and builds the feed in memory, instead of one useLiveQuery per
 * card. This only scales to a single-user, hundreds-to-low-thousands-of-rows
 * dataset (same sizing assumption CLAUDE.md already documents for the
 * in-memory isCustom filter in useExercises.ts) — if this workout log ever
 * spans years of real use, this hook is the first place to revisit with
 * date-range-limited queries instead of a full-table load.
 */
export function useHistoryFeed(): HistoryMonthGroup[] | undefined {
  return useLiveQuery(async () => {
    const [workouts, routines, workoutExercises, setLogs, exercises] = await Promise.all([
      db.workouts.toArray(),
      db.routines.toArray(),
      db.workoutExercises.toArray(),
      db.setLogs.toArray(),
      db.exercises.toArray(),
    ])

    const finished = workouts
      .filter((w) => w.finishedAt !== undefined)
      .sort((a, b) => b.startedAt - a.startedAt)

    const routineNameById = new Map(routines.map((r) => [r.id, r.name]))
    const exerciseById = new Map(exercises.map((e) => [e.id, e]))

    const workoutExercisesByWorkoutId = new Map<string, WorkoutExercise[]>()
    for (const we of workoutExercises) {
      const list = workoutExercisesByWorkoutId.get(we.workoutId) ?? []
      list.push(we)
      workoutExercisesByWorkoutId.set(we.workoutId, list)
    }

    const setsByWorkoutExerciseId = new Map<string, SetLog[]>()
    for (const set of setLogs) {
      const list = setsByWorkoutExerciseId.get(set.workoutExerciseId) ?? []
      list.push(set)
      setsByWorkoutExerciseId.set(set.workoutExerciseId, list)
    }

    const prProgression = computePRProgression(setLogs, exerciseById)

    const groups = new Map<number, HistoryMonthGroup>()
    for (const workout of finished) {
      const workoutExercisesForWorkout = (workoutExercisesByWorkoutId.get(workout.id) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((we) => ({
          ...we,
          exercise: exerciseById.get(we.exerciseId),
          sets: (setsByWorkoutExerciseId.get(we.id) ?? []).slice().sort((a, b) => a.setNumber - b.setNumber),
        }))

      const summary = computeWorkoutSummary(workoutExercisesForWorkout)
      const prCount = workoutExercisesForWorkout.reduce((count, we) => {
        const prSetsInExercise = we.sets.filter((set) => {
          const flags = prProgression.bySetId.get(set.id)
          return flags && (flags.isE1RMPR || flags.isWeightForRepsPR)
        })
        return count + prSetsInExercise.length
      }, 0)

      const monthStart = startOfMonth(workout.startedAt)
      let group = groups.get(monthStart)
      if (!group) {
        group = { monthStart, label: formatMonthLabel(monthStart), entries: [] }
        groups.set(monthStart, group)
      }

      group.entries.push({
        workout,
        routineName: workout.routineId ? (routineNameById.get(workout.routineId) ?? null) : null,
        summary,
        prCount,
      })
    }

    return Array.from(groups.values()).sort((a, b) => b.monthStart - a.monthStart)
  }, [])
}
