import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { Input } from '../../components/ui/Input'
import { MuscleFilterBar } from './MuscleFilterBar'
import { useExerciseList } from './useExercises'
import { MUSCLE_LABELS, type PrimaryMuscle } from '../../db/types'

interface ExercisePickerSheetProps {
  title?: string
  onPick: (exerciseId: string) => void
  onClose: () => void
}

/**
 * Shared exercise-search sheet — reused for adding exercises to an active
 * workout, building a routine, and picking an exercise for Analytics charts.
 * The caller decides what "picking" an exercise means via `onPick`.
 */
export function ExercisePickerSheet({ title = 'Add Exercise', onPick, onClose }: ExercisePickerSheetProps) {
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<PrimaryMuscle | null>(null)
  const exercises = useExerciseList(search, muscle)

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="px-4 pt-3">
        <Input
          type="search"
          placeholder="Search exercises"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="pt-3">
        <MuscleFilterBar value={muscle} onChange={setMuscle} />
      </div>
      <div>
        {exercises?.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onPick(exercise.id)}
            className="flex min-h-14 w-full items-center justify-between border-b border-border px-4 py-3 text-left active:bg-surface-1"
          >
            <div>
              <p className="font-medium text-slate-100">{exercise.name}</p>
              <p className="text-sm text-slate-500">{MUSCLE_LABELS[exercise.primaryMuscle]}</p>
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
