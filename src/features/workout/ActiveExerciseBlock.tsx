import { EllipsisVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { UnitPreference } from '../../db/types'
import { setDisplayInfo } from '../../lib/setTypes'
import { SetLogRow } from './SetLogRow'
import { addSet, type WorkoutExerciseWithDetails } from './useActiveWorkout'

interface ActiveExerciseBlockProps {
  workoutExercise: WorkoutExerciseWithDetails
  unit: UnitPreference
  /** Resolved rest for this exercise; 0 disables the timer for it. */
  restSeconds: number
  onOpenMenu: () => void
}

/**
 * One exercise in the active workout: its heading, its set rows and "+ Add
 * Set" — and the sortable unit for reordering, so the whole group travels
 * together.
 *
 * The drag handle is the heading *name only*, never the set rows: those own
 * the horizontal swipe-to-delete gesture and are full of inputs. Vertical drag
 * from the heading and horizontal drag from a set row therefore never contend
 * for the same touch. The name carries the `drag-handle` utility for the iOS
 * text-selection/callout suppression a long press otherwise triggers — see
 * index.css — and the ⋮ button stays outside the handle so it is still a
 * plain tap.
 */
export function ActiveExerciseBlock({
  workoutExercise,
  unit,
  restSeconds,
  onOpenMenu,
}: ActiveExerciseBlockProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: workoutExercise.id })

  // Displayed numbering counts working sets only, so a warmup reads "W" and
  // everything below it renumbers — see setDisplayInfo.
  const displays = setDisplayInfo(workoutExercise.sets)
  const name = workoutExercise.exercise?.name ?? 'Exercise'

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // The lifted block has to paint over its neighbours as it passes them.
        position: 'relative',
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`mt-3 first:mt-0 ${
        isDragging ? 'rounded-xl bg-surface-1 opacity-95 shadow-lg ring-1 ring-accent/50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-1">
        <p
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          // dnd-kit's attributes make this a role="button" and put it in the
          // tab order; without a KeyboardSensor (this is a phone-only PWA)
          // that would be a focus stop that does nothing. The role and
          // aria-roledescription are still worth keeping for VoiceOver.
          tabIndex={-1}
          aria-label={`${name} — press and hold to reorder`}
          className="drag-handle min-w-0 flex-1 truncate py-1 font-semibold text-slate-100"
        >
          {name}
        </p>
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={`${name} options`}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-surface-1"
        >
          <EllipsisVertical size={20} />
        </button>
      </div>

      {workoutExercise.sets.map((set, index) => (
        <SetLogRow
          key={set.id}
          set={set}
          unit={unit}
          display={displays[index]}
          restSeconds={restSeconds}
          exerciseName={workoutExercise.exercise?.name}
        />
      ))}

      <button
        type="button"
        onClick={() => addSet(workoutExercise.id)}
        className="mx-4 mt-1 min-h-11 rounded-xl border border-dashed border-border px-4 text-sm text-slate-400 active:bg-surface-1"
      >
        + Add Set
      </button>
    </div>
  )
}
