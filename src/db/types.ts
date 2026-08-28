export type PrimaryMuscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'
  | 'fullBody'

export const PRIMARY_MUSCLES: PrimaryMuscle[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'cardio',
  'fullBody',
]

export const MUSCLE_LABELS: Record<PrimaryMuscle, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  cardio: 'Cardio',
  fullBody: 'Full Body',
}

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'smithMachine'
  | 'other'

export const EQUIPMENT_TYPES: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smithMachine',
  'other',
]

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  smithMachine: 'Smith Machine',
  other: 'Other',
}

export interface Exercise {
  id: string
  name: string
  primaryMuscle: PrimaryMuscle
  secondaryMuscles: PrimaryMuscle[]
  equipment: Equipment
  isCustom: boolean
  notes: string
}

export interface RoutineExercise {
  exerciseId: string
  targetSets: number
  targetRepRange: string
  /**
   * Rest between sets, in seconds. Seeded from defaultRestSecondsFor()
   * (src/lib/restTimer.ts) when the exercise is added to a routine, then
   * freely editable per exercise in the routine editor.
   *
   * Optional because routines saved before this field existed have it
   * undefined, and it's a plain non-indexed field inside the embedded
   * `exercises` array — no Dexie version bump (see CLAUDE.md). Every read
   * site resolves `restTimerSeconds ?? defaultRestSecondsFor(exercise)`
   * rather than migrating the rows, so an old routine picks up a sensible
   * default the first time it's used and keeps it once re-saved.
   */
  restTimerSeconds?: number
}

export interface Routine {
  id: string
  name: string
  exercises: RoutineExercise[]
}

export interface Workout {
  id: string
  routineId?: string
  /**
   * Snapshot of the routine's name at the moment this workout was started
   * from it. History prefers the *live* routine name (via routineId) so a
   * rename shows up on past workouts too, but falls back to this snapshot
   * if the routine has since been deleted — deleting a routine must never
   * make its past workouts revert to "Freeform". Undefined for freeform
   * workouts (no routineId) and for pre-existing rows before this field
   * existed (backfilled by the v3 schema migration instead).
   */
  routineName?: string
  startedAt: number
  finishedAt?: number
  notes: string
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  order: number
}

export type SetType = 'warmup' | 'normal' | 'dropset' | 'failure'

export interface SetLog {
  id: string
  workoutExerciseId: string
  /** Denormalized from workoutExercises — see CLAUDE.md "Denormalized fields on SetLog". */
  exerciseId: string
  /** Denormalized from workoutExercises — see CLAUDE.md "Denormalized fields on SetLog". */
  workoutId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
  type: SetType
  completed: boolean
  timestamp: number
  /**
   * Whether the user has directly entered a weight/reps value for this set
   * (or it carried forward an already-touched value from the previous set
   * in the same workout). `false` means weightKg/reps are still the
   * untouched creation default — 0 is a legitimate real value (e.g.
   * bodyweight exercises), so it can't double as an "unset" sentinel; this
   * flag is what SetLogRow uses to decide whether to show the last-session
   * placeholder instead of the stored number. Missing on rows created
   * before this field existed — treat that as `true` (real historical data,
   * never placeholder-eligible). See CLAUDE.md "Active Workout" notes.
   */
  touched?: boolean
}

export type UnitPreference = 'kg' | 'lb'

export interface Setting {
  key: string
  value: unknown
}
