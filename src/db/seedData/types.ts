import type { Exercise } from '../types'

export type SeedExercise = Omit<Exercise, 'id' | 'isCustom' | 'notes'>
