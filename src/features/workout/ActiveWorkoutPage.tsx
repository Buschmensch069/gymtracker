import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { NotebookPen } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Sheet } from '../../components/ui/Sheet'
import { Textarea } from '../../components/ui/Textarea'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDuration } from '../../lib/dates'
import { db } from '../../db/schema'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { SetLogRow } from './SetLogRow'
import {
  addExerciseToWorkout,
  addSet,
  discardWorkout,
  finishWorkout,
  removeExerciseFromWorkout,
  useActiveWorkout,
  useWorkoutExercises,
} from './useActiveWorkout'

export function ActiveWorkoutPage() {
  const activeWorkout = useActiveWorkout()
  const [unit] = useUnitPreference()
  const workoutExercises = useWorkoutExercises(activeWorkout?.id)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  if (activeWorkout === undefined) return null

  // No standalone empty state here anymore — starting a workout (empty or
  // from a routine) happens on the Workouts tab; this route only exists
  // while a workout is actually in progress.
  if (activeWorkout === null) {
    return <Navigate to="/workouts" replace />
  }

  const handleDiscard = () => {
    if (!confirm('Discard this workout? All exercises and sets logged so far will be deleted. This cannot be undone.')) {
      return
    }
    discardWorkout(activeWorkout.id)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Workout"
        action={
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm tabular-nums text-slate-500">
              {formatDuration(activeWorkout.startedAt)}
            </span>
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              aria-label="Workout notes"
              className={activeWorkout.notes ? 'text-accent' : 'text-slate-500'}
            >
              <NotebookPen size={20} />
            </button>
            <button type="button" onClick={handleDiscard} className="text-sm text-red-400">
              Discard
            </button>
          </div>
        }
      />

      <div className="flex-1 scroll-touch pb-4">
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
              className="mx-4 mt-1 min-h-11 rounded-xl border border-dashed border-border px-4 text-sm text-slate-400 active:bg-surface-1"
            >
              + Add Set
            </button>
          </div>
        ))}
      </div>

      {/* pb-safe on its own wrapper — it overrides py-3's bottom padding if
          they share an element, which zeroes the action bar's padding
          in-browser (inset 0). See PageHeader for the same split. */}
      <div className="shrink-0 border-t border-border pb-safe">
        <div className="flex gap-2 px-4 py-3">
          <Button variant="secondary" fullWidth onClick={() => setShowAddExercise(true)}>
            Add Exercise
          </Button>
          <Button fullWidth onClick={() => finishWorkout(activeWorkout.id)}>
            Finish
          </Button>
        </div>
      </div>

      {showAddExercise && (
        <ExercisePickerSheet
          onPick={async (exerciseId) => {
            await addExerciseToWorkout(activeWorkout.id, exerciseId)
            setShowAddExercise(false)
          }}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      {showNotes && (
        <Sheet title="Workout Notes" onClose={() => setShowNotes(false)}>
          <div className="p-4">
            <Textarea
              className="min-h-40"
              autoFocus
              defaultValue={activeWorkout.notes}
              placeholder="How did it feel? Anything to remember for next time?"
              onBlur={(e) => db.workouts.update(activeWorkout.id, { notes: e.target.value })}
            />
          </div>
        </Sheet>
      )}
    </div>
  )
}
