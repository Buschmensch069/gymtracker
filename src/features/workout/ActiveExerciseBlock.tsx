import { EllipsisVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MUSCLE_LABELS, type UnitPreference } from '../../db/types'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
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
 *
 * Each block reads as its own card, keyed to the exercise's primary muscle
 * (MUSCLE_COLORS, the same hues as the routine dots and the weekly-sets
 * chart): a full-height spine down the left edge, the name in that colour,
 * and the muscle spelled out beside it so identity never rests on colour
 * alone — the Chip rule, applied here.
 *
 * The colour is deliberately carried by an absolutely-positioned spine and a
 * heading band, never by a border or horizontal inset on the block. The set
 * row is within ~18px of filling a 390pt screen (36 + 144 + 120 + 44 of
 * controls plus its own padding), so anything that costs layout width here
 * comes straight out of the weight and reps fields and wraps the row on a
 * smaller phone.
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
  const muscle = workoutExercise.exercise?.primaryMuscle

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
      className={`mt-5 first:mt-0 pb-1 ${
        isDragging ? 'rounded-xl bg-surface-1 opacity-95 shadow-lg ring-1 ring-accent/50' : ''
      }`}
    >
      <div className="mb-1 flex items-center gap-2 border-y border-border bg-surface-1 py-1 pl-4 pr-2">
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
          className="drag-handle min-w-0 flex-1 truncate py-1 font-semibold"
          style={{ color: muscle ? MUSCLE_COLORS[muscle] : undefined }}
        >
          {name}
        </p>
        {/* Alongside the name rather than under it: the label is what keeps
            the block's identity off colour alone (the Chip rule), and on a
            phone it should not cost the block a whole extra line. */}
        {muscle && (
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {MUSCLE_LABELS[muscle]}
          </span>
        )}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={`${name} options`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-surface-2"
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
        className="mx-4 mt-1 min-h-11 rounded-xl border border-dashed border-border px-4 text-sm text-slate-400 active:bg-surface-2"
      >
        + Add Set
      </button>

      {/* Last in the DOM, not first: absolutely positioned either way, but the
          heading band is opaque and would otherwise paint over the top of it.
          Absolute so the spine costs the set rows no width — see above. */}
      {muscle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full"
          style={{ backgroundColor: MUSCLE_COLORS[muscle] }}
        />
      )}
    </div>
  )
}
