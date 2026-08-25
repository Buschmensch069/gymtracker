import type { SeedExercise } from './types'

export const backExercises: SeedExercise[] = [
  { name: 'Deadlift', primaryMuscle: 'back', secondaryMuscles: ['hamstrings', 'glutes', 'core'], equipment: 'barbell' },
  { name: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'forearms'], equipment: 'barbell' },
  { name: 'Pendlay Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'barbell' },
  { name: 'T-Bar Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'machine' },
  { name: 'Seated Cable Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'forearms'], equipment: 'cable' },
  { name: 'Single-Arm Dumbbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'dumbbell' },
  { name: 'Chest-Supported Dumbbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'dumbbell' },
  { name: 'Pull-Up', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'forearms'], equipment: 'bodyweight' },
  { name: 'Chin-Up', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'bodyweight' },
  { name: 'Lat Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'cable' },
  { name: 'Close-Grip Lat Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'cable' },
  { name: 'Straight-Arm Pulldown', primaryMuscle: 'back', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Inverted Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'bodyweight' },
  { name: 'Rack Pull', primaryMuscle: 'back', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'barbell' },
  { name: 'Machine Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'machine' },
  { name: 'Reverse-Grip Lat Pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'cable' },
  { name: 'Landmine Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'other' },
  { name: 'Cable Pullover', primaryMuscle: 'back', secondaryMuscles: ['triceps'], equipment: 'cable' },
  { name: 'Dumbbell Pullover', primaryMuscle: 'back', secondaryMuscles: ['chest', 'triceps'], equipment: 'dumbbell' },
  { name: 'Back Extension', primaryMuscle: 'back', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'bodyweight' },
]
