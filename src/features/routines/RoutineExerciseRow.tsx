import { GripVertical, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { StepperButton } from '../../components/ui/Stepper'
import type { Exercise, RoutineExercise } from '../../db/types'

interface RoutineExerciseRowProps {
  routineExercise: RoutineExercise
  exercise: Exercise | undefined
  onChange: (changes: Partial<RoutineExercise>) => void
  onRemove: () => void
}

export function RoutineExerciseRow({ routineExercise, exercise, onChange, onRemove }: RoutineExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routineExercise.exerciseId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-2 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex h-11 w-8 shrink-0 touch-none items-center justify-center text-slate-500"
      >
        <GripVertical size={18} />
      </button>

      <p className="min-w-0 flex-1 truncate font-medium text-slate-100">{exercise?.name ?? 'Exercise'}</p>

      <div className="flex shrink-0 items-center gap-1">
        <StepperButton
          label="Decrease target sets"
          onStep={() => onChange({ targetSets: Math.max(1, routineExercise.targetSets - 1) })}
        >
          −
        </StepperButton>
        <span className="w-5 text-center font-mono text-sm tabular-nums text-slate-100">
          {routineExercise.targetSets}
        </span>
        <StepperButton label="Increase target sets" onStep={() => onChange({ targetSets: routineExercise.targetSets + 1 })}>
          +
        </StepperButton>
      </div>

      <input
        type="text"
        value={routineExercise.targetRepRange}
        onChange={(e) => onChange({ targetRepRange: e.target.value })}
        placeholder="8-12"
        className="h-9 w-16 shrink-0 rounded-lg border border-border bg-surface-2 px-2 text-center text-sm tabular-nums text-slate-100 focus:border-accent focus:outline-none"
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove exercise"
        className="flex h-11 w-8 shrink-0 items-center justify-center text-slate-500"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
