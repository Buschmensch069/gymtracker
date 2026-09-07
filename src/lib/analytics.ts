import type { Exercise, PrimaryMuscle, SetLog, Workout } from '../db/types'
import { formatWeekLabel, startOfWeek } from './dates'
import { WEIGHT_EPSILON_KG, isHeavierKg } from './units'

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

/**
 * Decimals an estimated-1RM readout is shown to. One, not zero: a 1.25kg
 * micro-plate moves e1RM by a fraction of a unit, and rounding to whole units
 * hides that step from both the PR list and the trend line. Not the full
 * WEIGHT_DECIMALS either — it's an estimate, and two decimals would imply a
 * precision the formula doesn't have.
 */
export const E1RM_DISPLAY_DECIMALS = 1

/**
 * WEIGHT_EPSILON_KG carried through Epley's rep factor: e1RM scales the
 * weight by up to (1 + 12/30), so two weights that count as equal can differ
 * by that much more once estimated. Comparing estimates against the unscaled
 * tolerance would let the difference reappear as a spurious e1RM PR.
 */
const E1RM_EPSILON = WEIGHT_EPSILON_KG * (1 + EPLEY_MAX_REPS_FOR_E1RM / 30)

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
 *
 * Summing fractional weights leaves the usual binary residue: 6.25kg × 8 plus
 * 62.5kg × 5 lands ~1e-13 off the round number. Harmless as it stands —
 * every tonnage readout rounds to whole units — but a future *comparison* of
 * two tonnages ("beat last week", say) would need `WEIGHT_EPSILON_KG`, the
 * way the PR walk below does.
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

/**
 * How one set compares with the set that held the same position last session.
 * `mixed` is its own answer on purpose: trading weight for reps (80×5 after
 * 70×8) is neither progress nor regression, and forcing it into one of those
 * would put a green arrow on a session the lifter would not call better.
 */
export type SetComparison = 'up' | 'down' | 'same' | 'mixed'

/**
 * Compares a set against the same-numbered set of the previous session.
 *
 * "Better" is defined the way it reads at the rack: more weight without
 * dropping reps, or the same weight for more reps. Weight is compared with
 * `isHeavierKg`, never `>` — see the WEIGHT_EPSILON_KG note in units.ts, or
 * repeating an identical set imported from another tool shows an arrow.
 */
export function compareSets(
  current: { weightKg: number; reps: number },
  previous: { weightKg: number; reps: number },
): SetComparison {
  const weight = isHeavierKg(current.weightKg, previous.weightKg)
    ? 1
    : isHeavierKg(previous.weightKg, current.weightKg)
      ? -1
      : 0
  const reps = Math.sign(current.reps - previous.reps)

  if (weight === 0 && reps === 0) return 'same'
  if (weight >= 0 && reps >= 0) return 'up'
  if (weight <= 0 && reps <= 0) return 'down'
  return 'mixed'
}

/**
 * Minimum distinct sessions before this app will describe an exercise as
 * progressing or stalled.
 *
 * Four, because the first session is only a baseline — it establishes the
 * number the others are measured against — leaving three chances to beat it.
 * Two flat sessions is an ordinary bad week (poor sleep, a deload, a busy
 * rack); three starts to be a pattern worth naming. At a typical once- or
 * twice-weekly cadence four sessions is also roughly a month of data, which
 * is the shortest span over which "no progress" means anything at all.
 * Below this the section says how many sessions are still needed rather
 * than showing a trend nobody should act on.
 */
export const MIN_SESSIONS_FOR_REP_TREND = 4

/** Weeks without a heavier set at the anchor rep count before an exercise counts as stalled. */
export const STALL_WEEKS = 8

const MS_PER_DAY = 86_400_000

export interface RepBest {
  reps: number
  bestWeightKg: number
  /**
   * When the current best was first hit. For a rep count trained only once
   * this is simply when it was achieved — there was nothing to improve on.
   */
  lastImprovedAt: number
  setCount: number
  sessionCount: number
}

export interface ExerciseRepProgress {
  exerciseId: string
  /** Distinct workouts containing at least one working set of this exercise. */
  sessionCount: number
  lastSessionAt: number
  /** Best weight per rep count, heaviest rep counts last. */
  repBests: RepBest[]
  /**
   * The rep count with the most working sets — the one a stall is judged at,
   * since it's where this lifter actually trains the movement. Ties go to the
   * more recently used rep count.
   */
  anchor: RepBest | undefined
  weeksSinceImprovement: number | undefined
  hasEnoughData: boolean
  /**
   * Not trained inside the stall window at all. Kept separate from `stalled`:
   * an exercise you dropped two months ago hasn't plateaued, and flagging it
   * would bury the ones you are actually grinding on.
   */
  dormant: boolean
  stalled: boolean
}

/**
 * Best weight at each rep count for one exercise, with the date each best was
 * last improved — the "am I getting stronger at this movement?" question
 * answered without an estimated-1RM model. Nothing here extrapolates: every
 * number shown is a set that was actually performed.
 *
 * Deliberately spans all history rather than the Analytics time range, for
 * the same reason the PR list does: "best at 8 reps" means best ever, and a
 * windowed version of it would silently disagree with the PR list. The stall
 * window needs a longer lookback than the default 8-week range can give it
 * anyway.
 */
export function computeRepProgress(exerciseId: string, sets: SetLog[], now = Date.now()): ExerciseRepProgress {
  const working = sets
    .filter((set) => set.exerciseId === exerciseId && isWorkingSet(set))
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)

  const sessionIds = new Set(working.map((set) => set.workoutId))
  const lastSessionAt = working.length ? working[working.length - 1].timestamp : 0

  const byReps = new Map<number, RepBest & { sessions: Set<string>; lastUsedAt: number }>()
  for (const set of working) {
    const entry = byReps.get(set.reps)
    if (!entry) {
      byReps.set(set.reps, {
        reps: set.reps,
        bestWeightKg: set.weightKg,
        lastImprovedAt: set.timestamp,
        setCount: 1,
        sessionCount: 1,
        sessions: new Set([set.workoutId]),
        lastUsedAt: set.timestamp,
      })
      continue
    }
    entry.setCount += 1
    entry.sessions.add(set.workoutId)
    entry.sessionCount = entry.sessions.size
    entry.lastUsedAt = set.timestamp
    // Walked chronologically, so the first set to clear the running best is
    // the improvement — a later equal set doesn't reset the date.
    if (isHeavierKg(set.weightKg, entry.bestWeightKg)) {
      entry.bestWeightKg = set.weightKg
      entry.lastImprovedAt = set.timestamp
    }
  }

  const entries = Array.from(byReps.values())
  const repBests: RepBest[] = entries
    .map(({ reps, bestWeightKg, lastImprovedAt, setCount, sessionCount }) => ({
      reps,
      bestWeightKg,
      lastImprovedAt,
      setCount,
      sessionCount,
    }))
    .sort((a, b) => a.reps - b.reps)

  const anchorEntry = entries.reduce<(typeof entries)[number] | undefined>((best, entry) => {
    if (!best) return entry
    if (entry.setCount !== best.setCount) return entry.setCount > best.setCount ? entry : best
    return entry.lastUsedAt > best.lastUsedAt ? entry : best
  }, undefined)
  const anchor = anchorEntry && repBests.find((rep) => rep.reps === anchorEntry.reps)

  const sessionCount = sessionIds.size
  const hasEnoughData = sessionCount >= MIN_SESSIONS_FOR_REP_TREND
  const weeksSinceImprovement = anchor
    ? Math.floor((now - anchor.lastImprovedAt) / (7 * MS_PER_DAY))
    : undefined
  const dormant = working.length > 0 && now - lastSessionAt > STALL_WEEKS * 7 * MS_PER_DAY

  return {
    exerciseId,
    sessionCount,
    lastSessionAt,
    repBests,
    anchor,
    weeksSinceImprovement,
    hasEnoughData,
    dormant,
    stalled:
      hasEnoughData &&
      !dormant &&
      weeksSinceImprovement !== undefined &&
      weeksSinceImprovement >= STALL_WEEKS,
  }
}

/**
 * `computeRepProgress` for every exercise that has been trained at all, keyed
 * by exercise id. One pass over the set logs, in keeping with the Analytics
 * tab's load-everything-once approach.
 */
export function computeRepProgressByExercise(
  allSetLogs: SetLog[],
  now = Date.now(),
): Map<string, ExerciseRepProgress> {
  const byExercise = new Map<string, SetLog[]>()
  for (const set of allSetLogs) {
    if (!isWorkingSet(set)) continue
    const list = byExercise.get(set.exerciseId) ?? []
    list.push(set)
    byExercise.set(set.exerciseId, list)
  }

  const result = new Map<string, ExerciseRepProgress>()
  for (const [exerciseId, sets] of byExercise) {
    result.set(exerciseId, computeRepProgress(exerciseId, sets, now))
  }
  return result
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

    // Epsilon-compared, not `>`: repeating an identical lb-entered set would
    // otherwise trip a PR off a last-bit difference. See WEIGHT_EPSILON_KG.
    const currentBestForReps = snapshot.bestByReps.get(set.reps)
    const isWeightForRepsPR =
      !currentBestForReps || isHeavierKg(set.weightKg, currentBestForReps.weightKg)
    if (isWeightForRepsPR) {
      snapshot.bestByReps.set(set.reps, { weightKg: set.weightKg, date: set.timestamp, setId: set.id })
    }

    // e1RM is weight-scaled (weight x a rep factor), so the same tolerance
    // applies — and it matters more here, because the rep factor turns an
    // exact weight into a repeating fraction.
    const e1rm = computeE1RM(set.weightKg, set.reps)
    const isE1RMPR =
      e1rm !== null &&
      (!snapshot.bestE1RM || e1rm - snapshot.bestE1RM.value > E1RM_EPSILON)
    if (isE1RMPR && e1rm !== null) {
      snapshot.bestE1RM = { value: e1rm, weightKg: set.weightKg, reps: set.reps, date: set.timestamp, setId: set.id }
    }

    bySetId.set(set.id, { isE1RMPR, isWeightForRepsPR })
  }

  return { bySetId, byExercise }
}
