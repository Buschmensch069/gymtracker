import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { EllipsisVertical, NotebookPen } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Sheet } from '../../components/ui/Sheet'
import { Textarea } from '../../components/ui/Textarea'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDuration } from '../../lib/dates'
import { setDisplayInfo } from '../../lib/setTypes'
import { db } from '../../db/schema'
import type { SetLog } from '../../db/types'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { ExerciseMenuSheet } from './ExerciseMenuSheet'
import { ReorderExercisesSheet } from './ReorderExercisesSheet'
import { RestTimerBar } from './RestTimerBar'
import { SetLogRow } from './SetLogRow'
import { useRestSecondsByExercise } from './useRestTimer'
import {
  addExerciseToWorkout,
  addSet,
  discardWorkout,
  finishWorkout,
  removeExerciseFromWorkout,
  reorderWorkoutExercises,
  replaceExerciseInWorkout,
  useActiveWorkout,
  useWorkoutExercises,
  type WorkoutExerciseWithDetails,
} from './useActiveWorkout'

export function ActiveWorkoutPage() {
  const activeWorkout = useActiveWorkout()
  const [unit] = useUnitPreference()
  const workoutExercises = useWorkoutExercises(activeWorkout?.id)
  const restSecondsByExercise = useRestSecondsByExercise(
    activeWorkout?.routineId,
    (workoutExercises ?? []).map((we) => we.exercise),
  )
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  /** workoutExerciseId whose ⋮ menu is open. */
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /** workoutExerciseId being swapped for a different exercise. */
  const [replaceFor, setReplaceFor] = useState<string | null>(null)

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

  const handleRemoveExercise = (we: WorkoutExerciseWithDetails) => {
    if (
      hasLoggedWork(we.sets) &&
      !confirm(`Remove ${we.exercise?.name ?? 'this exercise'}? The sets logged for it will be deleted.`)
    ) {
      return
    }
    removeExerciseFromWorkout(we.id)
  }

  const handleReplaceExercise = (we: WorkoutExerciseWithDetails) => {
    if (
      hasLoggedWork(we.sets) &&
      !confirm(`Replace ${we.exercise?.name ?? 'this exercise'}? Its sets are kept but cleared.`)
    ) {
      return
    }
    setReplaceFor(we.id)
  }

  const menuExercise = workoutExercises?.find((we) => we.id === menuFor)

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

        {workoutExercises?.map((we) => {
          // Displayed numbering counts working sets only, so a warmup reads
          // "W" and everything below it renumbers — see setDisplayInfo.
          const displays = setDisplayInfo(we.sets)
          return (
            <div key={we.id} className="mt-3 first:mt-0">
              <div className="flex items-center justify-between gap-2 px-4 py-1">
                <p className="min-w-0 flex-1 truncate font-semibold text-slate-100">
                  {we.exercise?.name ?? 'Exercise'}
                </p>
                <button
                  type="button"
                  onClick={() => setMenuFor(we.id)}
                  aria-label={`${we.exercise?.name ?? 'Exercise'} options`}
                  className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-surface-1"
                >
                  <EllipsisVertical size={20} />
                </button>
              </div>
              {we.sets.map((set, index) => (
                <SetLogRow
                  key={set.id}
                  set={set}
                  unit={unit}
                  display={displays[index]}
                  restSeconds={restSecondsByExercise.get(we.exerciseId) ?? 0}
                  exerciseName={we.exercise?.name}
                />
              ))}
              <button
                type="button"
                onClick={() => addSet(we.id)}
                className="mx-4 mt-1 min-h-11 rounded-xl border border-dashed border-border px-4 text-sm text-slate-400 active:bg-surface-1"
              >
                + Add Set
              </button>
            </div>
          )
        })}
      </div>

      <RestTimerBar />

      {/* No bottom safe-area inset here: AppShell renders BottomTabBar below
          this action bar, so it is never flush with the home indicator. The
          pb-safe this used to carry was 34px of dead space in the middle of
          the layout. */}
      <div className="flex shrink-0 gap-2 border-t border-border px-4 py-3">
        <Button variant="secondary" fullWidth onClick={() => setShowAddExercise(true)}>
          Add Exercise
        </Button>
        <Button fullWidth onClick={() => finishWorkout(activeWorkout.id)}>
          Finish
        </Button>
      </div>

      {menuExercise && (
        <ExerciseMenuSheet
          exerciseName={menuExercise.exercise?.name ?? 'Exercise'}
          onReorder={() => setShowReorder(true)}
          onReplace={() => handleReplaceExercise(menuExercise)}
          onRemove={() => handleRemoveExercise(menuExercise)}
          onClose={() => setMenuFor(null)}
        />
      )}

      {showReorder && workoutExercises && (
        <ReorderExercisesSheet
          exercises={workoutExercises}
          onReorder={(ids) => reorderWorkoutExercises(activeWorkout.id, ids)}
          onClose={() => setShowReorder(false)}
        />
      )}

      {replaceFor && (
        <ExercisePickerSheet
          title="Replace Exercise"
          onPick={async (exerciseId) => {
            await replaceExerciseInWorkout(replaceFor, exerciseId)
            setReplaceFor(null)
          }}
          onClose={() => setReplaceFor(null)}
        />
      )}

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

/**
 * Is there anything on this exercise worth warning about before it is removed
 * or cleared? `touched` is missing on rows predating the field, and those are
 * real logged data (see SetLog.touched) — so an unknown counts as work.
 */
function hasLoggedWork(sets: SetLog[]): boolean {
  return sets.some((set) => set.completed || (set.touched ?? true))
}
