import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { NotebookPen } from 'lucide-react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Sheet } from '../../components/ui/Sheet'
import { Textarea } from '../../components/ui/Textarea'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDuration } from '../../lib/dates'
import { db } from '../../db/schema'
import type { SetLog } from '../../db/types'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { useExerciseById } from '../exercises/useExercises'
import { updateRoutine } from '../routines/useRoutines'
import { ActiveExerciseBlock } from './ActiveExerciseBlock'
import { ExerciseMenuSheet } from './ExerciseMenuSheet'
import { ReorderExercisesSheet } from './ReorderExercisesSheet'
import { RestTimerBar } from './RestTimerBar'
import { UpdateRoutineSheet } from './UpdateRoutineSheet'
import { planRoutineUpdate, type RoutineUpdatePlan } from './routineUpdate'
import { useRestSecondsByExercise } from './useRestTimer'
import {
  addExerciseToWorkout,
  discardWorkout,
  finishWorkout,
  removeExerciseFromWorkout,
  reorderWorkoutExercises,
  replaceExerciseInWorkout,
  useActiveWorkout,
  useWorkoutExercises,
  type WorkoutExerciseWithDetails,
} from './useActiveWorkout'

/**
 * How long the finger has to sit still on an exercise heading before it
 * becomes a drag. Long enough that a scroll flick started on the heading is
 * still a scroll, short enough not to feel stuck; `tolerance` cancels the
 * pending drag if the finger travels first, so an early move always scrolls.
 */
const ACTIVATION_DELAY_MS = 250
const ACTIVATION_TOLERANCE_PX = 8

export function ActiveWorkoutPage() {
  const activeWorkout = useActiveWorkout()
  const [unit] = useUnitPreference()
  const workoutExercises = useWorkoutExercises(activeWorkout?.id)
  const exerciseById = useExerciseById()
  const restSecondsByExercise = useRestSecondsByExercise(
    activeWorkout?.routineId,
    (workoutExercises ?? []).map((we) => we.exercise),
  )
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  /** workoutExerciseId whose menu is open. */
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /** workoutExerciseId being swapped for a different exercise. */
  const [replaceFor, setReplaceFor] = useState<string | null>(null)
  /** The routine rewrite offered on Finish; null means no prompt is open. */
  const [routineUpdatePlan, setRoutineUpdatePlan] = useState<RoutineUpdatePlan | null>(null)
  /**
   * The order a just-dropped drag put the exercises in, held only until the
   * live query comes back with it. Without this the list snaps back to the old
   * order for the frame between the drop and the write landing.
   */
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: ACTIVATION_DELAY_MS, tolerance: ACTIVATION_TOLERANCE_PX },
    }),
  )

  const orderedExercises = useMemo(() => {
    if (!workoutExercises || !pendingOrder) return workoutExercises
    const byId = new Map(workoutExercises.map((we) => [we.id, we]))
    const ordered = pendingOrder.map((id) => byId.get(id)).filter((we) => we !== undefined)
    // A stale pending order (an exercise was added or removed since the drop)
    // is dropped rather than partially applied.
    return ordered.length === workoutExercises.length ? ordered : workoutExercises
  }, [workoutExercises, pendingOrder])

  useEffect(() => {
    if (!pendingOrder || !workoutExercises) return
    if (orderedExercises === workoutExercises) {
      setPendingOrder(null)
      return
    }
    if (workoutExercises.every((we, index) => we.id === pendingOrder[index])) setPendingOrder(null)
  }, [orderedExercises, pendingOrder, workoutExercises])

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !orderedExercises) return
    const ids = orderedExercises.map((we) => we.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setPendingOrder(next)
    reorderWorkoutExercises(activeWorkout.id, next)
  }

  /**
   * Finishing goes through the routine diff first: a workout started from a
   * routine that ended up different is the moment to offer to update it (see
   * planRoutineUpdate for what counts as different). Everything else — a
   * freeform workout, a deleted routine, a session that matched the plan —
   * finishes straight away, with no extra tap.
   */
  const handleFinish = async () => {
    if (activeWorkout.routineId && workoutExercises && exerciseById) {
      const routine = await db.routines.get(activeWorkout.routineId)
      const plan = planRoutineUpdate(routine, workoutExercises, exerciseById)
      if (plan) {
        setRoutineUpdatePlan(plan)
        return
      }
    }
    await finishWorkout(activeWorkout.id)
  }

  const handleUpdateRoutineAndFinish = async (plan: RoutineUpdatePlan) => {
    // Exercises, their order and their target sets only — the plan already
    // carried rep ranges and rest timers over from the existing routine.
    await updateRoutine(plan.routineId, { exercises: plan.exercises })
    await finishWorkout(activeWorkout.id)
  }

  const menuExercise = orderedExercises?.find((we) => we.id === menuFor)

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
        {orderedExercises?.length === 0 && (
          <EmptyState title="No exercises yet" message="Tap Add Exercise to get started." />
        )}

        {orderedExercises && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={orderedExercises.map((we) => we.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedExercises.map((we) => (
                <ActiveExerciseBlock
                  key={we.id}
                  workoutExercise={we}
                  unit={unit}
                  restSeconds={restSecondsByExercise.get(we.exerciseId) ?? 0}
                  onOpenMenu={() => setMenuFor(we.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
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
        <Button fullWidth onClick={handleFinish}>
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

      {showReorder && orderedExercises && (
        <ReorderExercisesSheet
          exercises={orderedExercises}
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

      {routineUpdatePlan && (
        <UpdateRoutineSheet
          plan={routineUpdatePlan}
          onUpdate={() => handleUpdateRoutineAndFinish(routineUpdatePlan)}
          onSkip={() => finishWorkout(activeWorkout.id)}
          onClose={() => setRoutineUpdatePlan(null)}
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
