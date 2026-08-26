import { computeTonnage, isWorkingSet } from '../../lib/analytics'
import type { WorkoutExerciseWithDetails } from '../workout/useActiveWorkout'

export interface ExerciseLineData {
  exerciseId: string
  exerciseName: string
  setCount: number
  /** True when every working set shares the same weight/reps — the simple "3×8 @ 80kg" case. */
  uniform: boolean
  /** The shared weight if uniform, otherwise the top set's weight (by weight). */
  weightKg: number
  /** The shared reps if uniform, otherwise the top set's reps. */
  reps: number
}

export interface WorkoutSummary {
  totalVolumeKg: number
  totalSets: number
  exerciseLines: ExerciseLineData[]
}

/** Aggregates a workout's exercises into History-feed summary data. Stays in kg — callers format for display unit. */
export function computeWorkoutSummary(workoutExercises: WorkoutExerciseWithDetails[]): WorkoutSummary {
  let totalVolumeKg = 0
  let totalSets = 0
  const exerciseLines: ExerciseLineData[] = []

  for (const we of workoutExercises) {
    const workingSets = we.sets.filter(isWorkingSet)
    totalVolumeKg += computeTonnage(we.sets)
    totalSets += workingSets.length
    if (workingSets.length === 0) continue

    const first = workingSets[0]
    const uniform = workingSets.every((s) => s.weightKg === first.weightKg && s.reps === first.reps)
    const top = uniform ? first : workingSets.reduce((best, s) => (s.weightKg > best.weightKg ? s : best), first)

    exerciseLines.push({
      exerciseId: we.exerciseId,
      exerciseName: we.exercise?.name ?? 'Exercise',
      setCount: workingSets.length,
      uniform,
      weightKg: top.weightKg,
      reps: top.reps,
    })
  }

  return { totalVolumeKg, totalSets, exerciseLines }
}
