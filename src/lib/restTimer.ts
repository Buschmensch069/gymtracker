import type { Exercise, PrimaryMuscle } from '../db/types'

/**
 * Rest-between-sets defaults. A compound gets longer rest than an isolation
 * movement; these are only the seeded starting point — every routine exercise
 * carries its own editable `restTimerSeconds`.
 */
export const REST_COMPOUND_SECONDS = 180
export const REST_ISOLATION_SECONDS = 120

/** Bounds for the routine editor's stepper. 0 means "no rest timer for this exercise". */
export const REST_MIN_SECONDS = 0
export const REST_MAX_SECONDS = 600
export const REST_STEP_SECONDS = 15

/**
 * Compound (multi-joint) or isolation? Inferred from the seed data's own
 * tagging convention rather than a hand-maintained list of 150 exercise names.
 *
 * The signal is "does a second joint move?", read off which *region* the
 * synergists come from:
 *
 * - Two or more tagged synergists always means multi-joint. CLAUDE.md's
 *   convention is that secondaryMuscles is "a short, conservative list (1-2,
 *   rarely 3) of obviously-involved synergists", so two is already a lot.
 * - A torso prime mover with an *arm* synergist is multi-joint: the elbow is
 *   working alongside the shoulder. This is what separates every row,
 *   pulldown, chin-up and machine press (→ biceps/triceps) from the flies,
 *   rear-delt work and shrugs (→ shoulders/back), which stay single-joint
 *   even though they also carry one synergist.
 * - A leg prime mover with another *leg* synergist is multi-joint: hip and
 *   knee together. Hack squat, step-up, belt squat, curtsy lunge.
 *
 * Counting synergists alone was not enough — it put Lat Pulldown, every row
 * variant and Hack Squat on a 2-minute isolation rest.
 *
 * It is still a heuristic and it misjudges a few (Cable Pullover, Nordic
 * Hamstring Curl and Reverse Hyperextension all read as compound). That's
 * acceptable because it only picks the *default*, off by one 60-second step,
 * on a value that's editable per exercise in the routine editor — which is
 * where a disagreement gets settled.
 */
const ARM_MUSCLES = new Set<PrimaryMuscle>(['biceps', 'triceps', 'forearms'])
const TORSO_PRIMARIES = new Set<PrimaryMuscle>(['chest', 'back', 'shoulders'])
const LEG_MUSCLES = new Set<PrimaryMuscle>(['quadriceps', 'hamstrings', 'glutes'])

export function isCompound(exercise: Exercise): boolean {
  const { primaryMuscle, secondaryMuscles } = exercise
  if (secondaryMuscles.length >= 2) return true
  if (TORSO_PRIMARIES.has(primaryMuscle)) {
    return secondaryMuscles.some((muscle) => ARM_MUSCLES.has(muscle))
  }
  if (LEG_MUSCLES.has(primaryMuscle)) {
    return secondaryMuscles.some((muscle) => LEG_MUSCLES.has(muscle))
  }
  // Arm, calf, core and cardio prime movers are single-joint unless they had
  // two synergists, which the first check already caught (e.g. Dips).
  return false
}

export function defaultRestSecondsFor(exercise: Exercise | undefined): number {
  if (!exercise) return REST_ISOLATION_SECONDS
  return isCompound(exercise) ? REST_COMPOUND_SECONDS : REST_ISOLATION_SECONDS
}

/** "2:30", or "0:45". Negative input is clamped to 0 — callers format overtime themselves. */
export function formatRest(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
