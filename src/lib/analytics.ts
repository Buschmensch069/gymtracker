import type { Exercise, PrimaryMuscle, SetLog, Workout } from '../db/types'
import { formatWeekLabel, startOfWeek } from './dates'

const MS_PER_WEEK = 7 * 86_400_000

/**
 * Documented weighting for the weekly-sets-per-muscle metric: a set counts
 * fully toward its exercise's primary muscle, and half toward each
 * secondary muscle. Deliberately a named constant, not a magic number
 * scattered across chart code.
 */
export const MUSCLE_SET_WEIGHT = { primary: 1, secondary: 0.5 } as const

/**
 * Epley's formula degrades badly at high rep counts, so estimated-1RM is
 * only computed for sets at or below this rep count.
 */
export const EPLEY_MAX_REPS_FOR_E1RM = 12

export function computeE1RM(weightKg: number, reps: number): number | null {
  if (reps < 1 || reps > EPLEY_MAX_REPS_FOR_E1RM) return null
  return weightKg * (1 + reps / 30)
}

/** A "working set" excludes warmups — the shared definition every volume/PR metric below builds on. */
export function isWorkingSet(set: SetLog): boolean {
  return set.completed && set.type !== 'warmup'
}

/**
 * Sum of weight×reps over working sets only. Warmups are deliberately
 * excluded, for consistency with computeWeeklyMuscleSets below — tonnage
 * here will read lower than tools that count warmup volume too. That's an
 * intentional definition choice, not a bug.
 */
export function computeTonnage(sets: SetLog[]): number {
  return sets.filter(isWorkingSet).reduce((sum, set) => sum + set.weightKg * set.reps, 0)
}

/**
 * Weighted muscle-group breakdown for an arbitrary collection of sets (a
 * single workout, a week, a whole history) — the shared weighting logic
 * behind both computeWeeklyMuscleSets (bucketed by week) and a single
 * workout's muscle split (WorkoutDetailPage). Non-working sets are ignored.
 */
export function computeMuscleSplit(
  sets: SetLog[],
  exerciseById: Map<string, Exercise>,
): Partial<Record<PrimaryMuscle, number>> {
  const totals: Partial<Record<PrimaryMuscle, number>> = {}
  for (const set of sets) {
    if (!isWorkingSet(set)) continue
    const exercise = exerciseById.get(set.exerciseId)
    if (!exercise) continue
    totals[exercise.primaryMuscle] = (totals[exercise.primaryMuscle] ?? 0) + MUSCLE_SET_WEIGHT.primary
    for (const secondary of exercise.secondaryMuscles) {
      totals[secondary] = (totals[secondary] ?? 0) + MUSCLE_SET_WEIGHT.secondary
    }
  }
  return totals
}

export interface WeeklyMuscleSets {
  weekStart: number
  label: string
  totals: Partial<Record<PrimaryMuscle, number>>
}

/** Buckets working sets into the last `weekCount` Monday-anchored weeks, weighted by MUSCLE_SET_WEIGHT. */
export function computeWeeklyMuscleSets(
  sets: SetLog[],
  exerciseById: Map<string, Exercise>,
  weekCount: number,
): WeeklyMuscleSets[] {
  const currentWeekStart = startOfWeek(Date.now())
  const weeks: WeeklyMuscleSets[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = currentWeekStart - i * MS_PER_WEEK
    weeks.push({ weekStart, label: formatWeekLabel(weekStart), totals: {} })
  }
  const weekIndexByStart = new Map(weeks.map((week, index) => [week.weekStart, index]))

  const setsByWeekIndex = new Map<number, SetLog[]>()
  for (const set of sets) {
    const index = weekIndexByStart.get(startOfWeek(set.timestamp))
    if (index === undefined) continue
    const list = setsByWeekIndex.get(index) ?? []
    list.push(set)
    setsByWeekIndex.set(index, list)
  }

  for (const [index, weekSets] of setsByWeekIndex) {
    weeks[index].totals = computeMuscleSplit(weekSets, exerciseById)
  }

  return weeks
}

export interface WorkoutsPerWeek {
  weekStart: number
  label: string
  count: number
}

/** Finished-workout count per Monday-anchored week, for the last `weekCount` weeks. */
export function computeWorkoutsPerWeek(workouts: Workout[], weekCount: number): WorkoutsPerWeek[] {
  const currentWeekStart = startOfWeek(Date.now())
  const weeks: WorkoutsPerWeek[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = currentWeekStart - i * MS_PER_WEEK
    weeks.push({ weekStart, label: formatWeekLabel(weekStart), count: 0 })
  }
  const weekIndexByStart = new Map(weeks.map((week, index) => [week.weekStart, index]))

  for (const workout of workouts) {
    if (workout.finishedAt === undefined) continue
    const index = weekIndexByStart.get(startOfWeek(workout.startedAt))
    if (index === undefined) continue
    weeks[index].count += 1
  }

  return weeks
}

export interface WeeklyTonnage {
  weekStart: number
  label: string
  tonnageKg: number
}

/** Sum of computeTonnage per finished workout, bucketed into the last `weekCount` Monday-anchored weeks. */
export function computeWeeklyTonnage(setLogs: SetLog[], workouts: Workout[], weekCount: number): WeeklyTonnage[] {
  const currentWeekStart = startOfWeek(Date.now())
  const weeks: WeeklyTonnage[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = currentWeekStart - i * MS_PER_WEEK
    weeks.push({ weekStart, label: formatWeekLabel(weekStart), tonnageKg: 0 })
  }
  const weekIndexByStart = new Map(weeks.map((week, index) => [week.weekStart, index]))

  const setsByWorkoutId = new Map<string, SetLog[]>()
  for (const set of setLogs) {
    const list = setsByWorkoutId.get(set.workoutId) ?? []
    list.push(set)
    setsByWorkoutId.set(set.workoutId, list)
  }

  for (const workout of workouts) {
    if (workout.finishedAt === undefined) continue
    const index = weekIndexByStart.get(startOfWeek(workout.startedAt))
    if (index === undefined) continue
    weeks[index].tonnageKg += computeTonnage(setsByWorkoutId.get(workout.id) ?? [])
  }

  return weeks
}

export interface SetPRFlags {
  isE1RMPR: boolean
  isWeightForRepsPR: boolean
}

export interface ExercisePRSnapshot {
  bestE1RM?: { value: number; weightKg: number; reps: number; date: number; setId: string }
  bestByReps: Map<number, { weightKg: number; date: number; setId: string }>
}

export interface PRProgression {
  /** Per-set PR flags, keyed by SetLog id — used for History card badges and per-set detail badges. */
  bySetId: Map<string, SetPRFlags>
  /** Final best-known state per exercise, after walking every working set chronologically — used by the PR List page. */
  byExercise: Map<string, ExercisePRSnapshot>
}

/**
 * Walks every working set in chronological order, tracking each exercise's
 * running best e1RM and running best weight-for-each-rep-count. A set is
 * flagged as a PR if it beats everything logged for that exercise *before*
 * it. This is the single shared source of truth for PR detection — used by
 * the History feed (badge counts), WorkoutDetailPage (per-set badges), and
 * the Analytics PR List (final snapshot). Compute once per render and reuse
 * rather than recomputing per card.
 */
export function computePRProgression(
  allSetLogs: SetLog[],
  exerciseById: Map<string, Exercise>,
): PRProgression {
  const working = allSetLogs.filter(isWorkingSet).slice().sort((a, b) => a.timestamp - b.timestamp)

  const bySetId = new Map<string, SetPRFlags>()
  const byExercise = new Map<string, ExercisePRSnapshot>()

  for (const set of working) {
    if (!exerciseById.has(set.exerciseId)) continue

    let snapshot = byExercise.get(set.exerciseId)
    if (!snapshot) {
      snapshot = { bestByReps: new Map() }
      byExercise.set(set.exerciseId, snapshot)
    }

    const currentBestForReps = snapshot.bestByReps.get(set.reps)
    const isWeightForRepsPR = !currentBestForReps || set.weightKg > currentBestForReps.weightKg
    if (isWeightForRepsPR) {
      snapshot.bestByReps.set(set.reps, { weightKg: set.weightKg, date: set.timestamp, setId: set.id })
    }

    const e1rm = computeE1RM(set.weightKg, set.reps)
    const isE1RMPR = e1rm !== null && (!snapshot.bestE1RM || e1rm > snapshot.bestE1RM.value)
    if (isE1RMPR && e1rm !== null) {
      snapshot.bestE1RM = { value: e1rm, weightKg: set.weightKg, reps: set.reps, date: set.timestamp, setId: set.id }
    }

    bySetId.set(set.id, { isE1RMPR, isWeightForRepsPR })
  }

  return { bySetId, byExercise }
}
