import type { SeedExercise } from './types'

export const shoulderExercises: SeedExercise[] = [
  { name: 'Overhead Barbell Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'core'], equipment: 'barbell' },
  { name: 'Seated Dumbbell Shoulder Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'dumbbell' },
  { name: 'Arnold Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'dumbbell' },
  { name: 'Push Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'core', 'quadriceps'], equipment: 'barbell' },
  { name: 'Lateral Raise', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Cable Lateral Raise', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Front Raise', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Rear Delt Fly', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'dumbbell' },
  { name: 'Reverse Pec Deck', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'machine' },
  { name: 'Face Pull', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'cable' },
  { name: 'Barbell Upright Row', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'barbell' },
  { name: 'Machine Shoulder Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'machine' },
  { name: 'Smith Machine Shoulder Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'smithMachine' },
  { name: 'Landmine Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'core'], equipment: 'other' },
  { name: 'Cable Front Raise', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Dumbbell Shrug', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'dumbbell' },
  { name: 'Barbell Shrug', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: 'barbell' },
  { name: 'Handstand Push-Up', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'core'], equipment: 'bodyweight' },
]
