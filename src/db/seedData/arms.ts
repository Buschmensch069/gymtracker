import type { SeedExercise } from './types'

const biceps: SeedExercise[] = [
  { name: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'barbell' },
  { name: 'EZ-Bar Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'barbell' },
  { name: 'Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'dumbbell' },
  { name: 'Hammer Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Preacher Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell' },
  { name: 'Cable Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'cable' },
  { name: 'Concentration Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Spider Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell' },
]

const triceps: SeedExercise[] = [
  { name: 'Close-Grip Bench Press', primaryMuscle: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: 'barbell' },
  { name: 'Triceps Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Overhead Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Skull Crusher', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'barbell' },
  { name: 'Cable Overhead Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Dips (Triceps Focus)', primaryMuscle: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: 'bodyweight' },
  { name: 'Diamond Push-Up', primaryMuscle: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: 'bodyweight' },
  { name: 'Triceps Kickback', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Machine Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'machine' },
]

const forearms: SeedExercise[] = [
  { name: 'Wrist Curl', primaryMuscle: 'forearms', secondaryMuscles: [], equipment: 'barbell' },
  { name: 'Reverse Wrist Curl', primaryMuscle: 'forearms', secondaryMuscles: [], equipment: 'barbell' },
  { name: 'Reverse Curl', primaryMuscle: 'forearms', secondaryMuscles: ['biceps'], equipment: 'barbell' },
  { name: "Farmer's Carry", primaryMuscle: 'forearms', secondaryMuscles: ['core', 'back'], equipment: 'dumbbell' },
  { name: 'Dead Hang', primaryMuscle: 'forearms', secondaryMuscles: ['back'], equipment: 'bodyweight' },
  { name: 'Wrist Roller', primaryMuscle: 'forearms', secondaryMuscles: [], equipment: 'other' },
]

export const armExercises: SeedExercise[] = [...biceps, ...triceps, ...forearms]
