import { useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDuration } from '../../lib/dates'
import { AddExerciseToWorkoutSheet } from './AddExerciseToWorkoutSheet'
import { SetLogRow } from './SetLogRow'
import {
  addSet,
  finishWorkout,
  removeExerciseFromWorkout,
  startWorkout,
  useActiveWorkout,
  useWorkoutExercises,
} from './useActiveWorkout'

export function ActiveWorkoutPage() {
  const activeWorkout = useActiveWorkout()
  const [unit] = useUnitPreference()
  const workoutExercises = useWorkoutExercises(activeWorkout?.id)
  const [showAddExercise, setShowAddExercise] = useState(false)

  if (activeWorkout === undefined) return null

  if (activeWorkout === null) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader title="Workout" />
        <EmptyState
          title="No workout in progress"
          message="Start an empty workout and add exercises as you go."
          action={<Button onClick={() => startWorkout()}>Start Empty Workout</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Workout"
        action={
          <span className="text-sm text-slate-500">{formatDuration(activeWorkout.startedAt)}</span>
        }
      />

      <div className="flex-1 overflow-y-auto pb-4">
        {workoutExercises?.length === 0 && (
          <EmptyState title="No exercises yet" message="Tap Add Exercise to get started." />
        )}

        {workoutExercises?.map((we) => (
          <div key={we.id} className="mt-3 first:mt-0">
            <div className="flex items-center justify-between px-4 py-2">
              <p className="font-semibold text-slate-100">{we.exercise?.name ?? 'Exercise'}</p>
              <button
                type="button"
                onClick={() => removeExerciseFromWorkout(we.id)}
                className="text-sm text-slate-500"
              >
                Remove
              </button>
            </div>
            {we.sets.map((set) => (
              <SetLogRow key={set.id} set={set} unit={unit} />
            ))}
            <button
              type="button"
              onClick={() => addSet(we.id)}
              className="mx-4 mt-1 min-h-11 rounded-xl border border-dashed border-slate-700 px-4 text-sm text-slate-400 active:bg-slate-900"
            >
              + Add Set
            </button>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-slate-800 px-4 py-3 pb-safe">
        <Button variant="secondary" fullWidth onClick={() => setShowAddExercise(true)}>
          Add Exercise
        </Button>
        <Button fullWidth onClick={() => finishWorkout(activeWorkout.id)}>
          Finish
        </Button>
      </div>

      {showAddExercise && (
        <AddExerciseToWorkoutSheet
          workoutId={activeWorkout.id}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  )
}
