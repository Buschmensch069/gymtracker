import type { SeedExercise } from './types'

export const cardioExercises: SeedExercise[] = [
  { name: 'Treadmill Running', primaryMuscle: 'cardio', secondaryMuscles: [], equipment: 'other' },
  { name: 'Treadmill Incline Walking', primaryMuscle: 'cardio', secondaryMuscles: ['glutes', 'calves'], equipment: 'other' },
  { name: 'Stationary Bike', primaryMuscle: 'cardio', secondaryMuscles: ['quadriceps'], equipment: 'other' },
  { name: 'Rowing Machine', primaryMuscle: 'cardio', secondaryMuscles: ['back', 'hamstrings'], equipment: 'machine' },
  { name: 'Stair Climber', primaryMuscle: 'cardio', secondaryMuscles: ['glutes', 'quadriceps'], equipment: 'other' },
  { name: 'Elliptical', primaryMuscle: 'cardio', secondaryMuscles: [], equipment: 'other' },
  { name: 'Jump Rope', primaryMuscle: 'cardio', secondaryMuscles: ['calves'], equipment: 'other' },
  { name: 'Battle Ropes', primaryMuscle: 'cardio', secondaryMuscles: ['shoulders', 'core'], equipment: 'other' },
  { name: 'Assault Bike', primaryMuscle: 'cardio', secondaryMuscles: [], equipment: 'other' },
  { name: 'Sled Push', primaryMuscle: 'cardio', secondaryMuscles: ['quadriceps', 'glutes'], equipment: 'other' },
]
