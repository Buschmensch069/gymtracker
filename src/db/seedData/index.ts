import type { Exercise } from '../types'
import { chestExercises } from './chest'
import { backExercises } from './back'
import { shoulderExercises } from './shoulders'
import { legExercises } from './legs'
import { armExercises } from './arms'
import { coreExercises } from './core'
import { cardioExercises } from './cardio'
import { fullBodyExercises } from './fullBody'

const seedExercises = [
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...legExercises,
  ...armExercises,
  ...coreExercises,
  ...cardioExercises,
  ...fullBodyExercises,
]

export const allSeedExercises: Exercise[] = seedExercises.map((exercise) => ({
  ...exercise,
  id: crypto.randomUUID(),
  isCustom: false,
  notes: '',
}))
