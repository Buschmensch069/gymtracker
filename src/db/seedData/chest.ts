import type { SeedExercise } from './types'

export const chestExercises: SeedExercise[] = [
  { name: 'Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'barbell' },
  { name: 'Incline Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['shoulders', 'triceps'], equipment: 'barbell' },
  { name: 'Decline Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: 'barbell' },
  { name: 'Flat Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['shoulders', 'triceps'], equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['shoulders', 'triceps'], equipment: 'dumbbell' },
  { name: 'Decline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Fly', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Fly', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: 'dumbbell' },
  { name: 'Cable Fly', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: 'cable' },
  { name: 'Low-to-High Cable Fly', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: 'cable' },
  { name: 'Pec Deck Machine', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Chest Press Machine', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: 'machine' },
  { name: 'Push-Up', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders', 'core'], equipment: 'bodyweight' },
  { name: 'Incline Push-Up', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'bodyweight' },
  { name: 'Decline Push-Up', primaryMuscle: 'chest', secondaryMuscles: ['shoulders', 'triceps'], equipment: 'bodyweight' },
  { name: 'Dips (Chest Focus)', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'bodyweight' },
  { name: 'Smith Machine Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'smithMachine' },
  { name: 'Cable Crossover', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: 'cable' },
]
