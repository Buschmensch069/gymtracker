import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Sheet } from '../../components/ui/Sheet'
import type { WorkoutExerciseWithDetails } from './useActiveWorkout'

interface ReorderExercisesSheetProps {
  exercises: WorkoutExerciseWithDetails[]
  onReorder: (workoutExerciseIds: string[]) => void
  onClose: () => void
}

/**
 * Drag-to-reorder for the exercises of an in-progress workout.
 *
 * A separate sheet rather than grip handles in the workout list itself: those
 * rows are dense with inputs and already own the horizontal drag (see
 * `SwipeToDelete`), so a drag handle sitting among them would be both cramped
 * and ambiguous. Stripped to name and set count, reordering is a two-second
 * job with the whole list visible at once.
 *
 * Each drop is persisted immediately — `useWorkoutExercises` is a live query,
 * so the list underneath is already in the new order by the time the sheet
 * closes and there is nothing to "save".
 */
export function ReorderExercisesSheet({ exercises, onReorder, onClose }: ReorderExercisesSheetProps) {
  const [ids, setIds] = useState(() => exercises.map((we) => we.id))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byId = new Map(exercises.map((we) => [we.id, we]))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setIds(next)
    onReorder(next)
  }

  return (
    <Sheet title="Reorder Exercises" onClose={onClose}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 px-4 py-4">
            {ids.map((id) => {
              const workoutExercise = byId.get(id)
              if (!workoutExercise) return null
              return <ReorderRow key={id} id={id} workoutExercise={workoutExercise} />
            })}
          </div>
        </SortableContext>
      </DndContext>
    </Sheet>
  )
}

function ReorderRow({ id, workoutExercise }: { id: string; workoutExercise: WorkoutExerciseWithDetails }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const setCount = workoutExercise.sets.length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
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
      <p className="min-w-0 flex-1 truncate font-medium text-slate-100">
        {workoutExercise.exercise?.name ?? 'Exercise'}
      </p>
      <span className="shrink-0 text-sm tabular-nums text-slate-500">
        {setCount} {setCount === 1 ? 'set' : 'sets'}
      </span>
    </div>
  )
}
