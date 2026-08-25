import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import type { Exercise, PrimaryMuscle } from '../../db/types'
import { newId } from '../../lib/ids'

export function useExerciseList(search: string, muscle: PrimaryMuscle | null) {
  return useLiveQuery(async () => {
    let exercises = await db.exercises.toArray()

    if (muscle) {
      exercises = exercises.filter(
        (e) => e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle),
      )
    }

    const query = search.trim().toLowerCase()
    if (query) {
      exercises = exercises.filter((e) => e.name.toLowerCase().includes(query))
    }

    return exercises.sort((a, b) => a.name.localeCompare(b.name))
  }, [search, muscle])
}

export function useExercise(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined
    return db.exercises.get(id)
  }, [id])
}

export async function createCustomExercise(
  input: Omit<Exercise, 'id' | 'isCustom'>,
): Promise<string> {
  const id = newId()
  await db.exercises.add({ ...input, id, isCustom: true })
  return id
}

export async function updateExercise(id: string, changes: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, changes)
}

export async function deleteExercise(id: string): Promise<void> {
  await db.exercises.delete(id)
}
