import type { SeedExercise } from './types'

export const fullBodyExercises: SeedExercise[] = [
  { name: 'Clean and Jerk', primaryMuscle: 'fullBody', secondaryMuscles: ['quadriceps', 'shoulders', 'back'], equipment: 'barbell' },
  { name: 'Snatch', primaryMuscle: 'fullBody', secondaryMuscles: ['back', 'shoulders', 'hamstrings'], equipment: 'barbell' },
  { name: 'Kettlebell Swing', primaryMuscle: 'fullBody', secondaryMuscles: ['glutes', 'hamstrings', 'core'], equipment: 'kettlebell' },
  { name: 'Thruster', primaryMuscle: 'fullBody', secondaryMuscles: ['quadriceps', 'shoulders'], equipment: 'barbell' },
  { name: 'Burpee', primaryMuscle: 'fullBody', secondaryMuscles: ['chest', 'quadriceps', 'core'], equipment: 'bodyweight' },
]
