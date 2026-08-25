import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { Input } from '../../components/ui/Input'
import { MuscleFilterBar } from '../exercises/MuscleFilterBar'
import { useExerciseList } from '../exercises/useExercises'
import { MUSCLE_LABELS, type PrimaryMuscle } from '../../db/types'
import { addExerciseToWorkout } from './useActiveWorkout'

interface AddExerciseToWorkoutSheetProps {
  workoutId: string
  onClose: () => void
}

export function AddExerciseToWorkoutSheet({ workoutId, onClose }: AddExerciseToWorkoutSheetProps) {
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<PrimaryMuscle | null>(null)
  const exercises = useExerciseList(search, muscle)

  const handlePick = async (exerciseId: string) => {
    await addExerciseToWorkout(workoutId, exerciseId)
    onClose()
  }

  return (
    <Sheet title="Add Exercise" onClose={onClose}>
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
            onClick={() => handlePick(exercise.id)}
            className="flex min-h-14 w-full items-center justify-between border-b border-slate-800 px-4 py-3 text-left active:bg-slate-900"
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
