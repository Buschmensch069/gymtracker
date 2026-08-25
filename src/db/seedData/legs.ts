import type { SeedExercise } from './types'

const quadriceps: SeedExercise[] = [
  { name: 'Barbell Back Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings', 'core'], equipment: 'barbell' },
  { name: 'Front Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'core'], equipment: 'barbell' },
  { name: 'Goblet Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'core'], equipment: 'dumbbell' },
  { name: 'Leg Press', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'machine' },
  { name: 'Hack Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes'], equipment: 'machine' },
  { name: 'Smith Machine Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'smithMachine' },
  { name: 'Leg Extension', primaryMuscle: 'quadriceps', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Walking Lunge', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell' },
  { name: 'Bulgarian Split Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell' },
  { name: 'Step-Up', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes'], equipment: 'dumbbell' },
  { name: 'Sissy Squat', primaryMuscle: 'quadriceps', secondaryMuscles: [], equipment: 'bodyweight' },
  { name: 'Belt Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes'], equipment: 'machine' },
  { name: 'Zercher Squat', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'core', 'back'], equipment: 'barbell' },
  { name: 'Wall Sit', primaryMuscle: 'quadriceps', secondaryMuscles: [], equipment: 'bodyweight' },
  { name: 'Barbell Lunge', primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes'], equipment: 'barbell' },
]

const hamstrings: SeedExercise[] = [
  { name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell' },
  { name: 'Dumbbell Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'dumbbell' },
  { name: 'Stiff-Leg Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell' },
  { name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Nordic Hamstring Curl', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: 'bodyweight' },
  { name: 'Good Morning', primaryMuscle: 'hamstrings', secondaryMuscles: ['back', 'glutes'], equipment: 'barbell' },
  { name: 'Single-Leg Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'core'], equipment: 'dumbbell' },
  { name: 'Cable Pull-Through', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], equipment: 'cable' },
]

const glutes: SeedExercise[] = [
  { name: 'Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'barbell' },
  { name: 'Barbell Glute Bridge', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'barbell' },
  { name: 'Cable Kickback', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: 'cable' },
  { name: 'Glute Ham Raise', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'bodyweight' },
  { name: 'Curtsy Lunge', primaryMuscle: 'glutes', secondaryMuscles: ['quadriceps'], equipment: 'dumbbell' },
  { name: 'Sumo Deadlift', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings', 'quadriceps', 'back'], equipment: 'barbell' },
  { name: 'Banded Hip Abduction', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: 'band' },
  { name: 'Single-Leg Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'bodyweight' },
  { name: 'Frog Pump', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: 'bodyweight' },
  { name: 'Reverse Hyperextension', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'machine' },
]

const calves: SeedExercise[] = [
  { name: 'Standing Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Seated Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Dumbbell Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'dumbbell' },
  { name: 'Leg Press Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine' },
  { name: 'Smith Machine Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'smithMachine' },
  { name: 'Single-Leg Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'bodyweight' },
]

export const legExercises: SeedExercise[] = [...quadriceps, ...hamstrings, ...glutes, ...calves]
