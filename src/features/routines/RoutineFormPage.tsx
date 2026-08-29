import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import { useExerciseById } from '../exercises/useExercises'
import { defaultRestSecondsFor } from '../../lib/restTimer'
import type { Exercise, Routine, RoutineExercise } from '../../db/types'
import { RoutineExerciseRow } from './RoutineExerciseRow'
import {
  DEFAULT_REP_RANGE,
  DEFAULT_TARGET_SETS,
  createRoutine,
  deleteRoutine,
  updateRoutine,
  useRoutine,
} from './useRoutines'

export function RoutineFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const existing = useRoutine(id)
  const exerciseById = useExerciseById()

  if (isEdit && existing === undefined) return null
  if (exerciseById === undefined) return null

  return <RoutineFormFields key={id ?? 'new'} id={id} existing={existing} exerciseById={exerciseById} />
}

function RoutineFormFields({
  id,
  existing,
  exerciseById,
}: {
  id: string | undefined
  existing: Routine | undefined
  exerciseById: Map<string, Exercise>
}) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState(existing?.name ?? '')
  const [exercises, setExercises] = useState<RoutineExercise[]>(existing?.exercises ?? [])
  const [showPicker, setShowPicker] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const canSave = name.trim().length > 0

  const handleAdd = (exerciseId: string) => {
    setShowPicker(false)
    if (exercises.some((re) => re.exerciseId === exerciseId)) return
    setExercises((prev) => [
      ...prev,
      {
        exerciseId,
        targetSets: DEFAULT_TARGET_SETS,
        targetRepRange: DEFAULT_REP_RANGE,
        // Seeded, not fixed — the row's rest stepper edits it from here.
        restTimerSeconds: defaultRestSecondsFor(exerciseById.get(exerciseId)),
      },
    ])
  }

  const handleChange = (exerciseId: string, changes: Partial<RoutineExercise>) => {
    setExercises((prev) => prev.map((re) => (re.exerciseId === exerciseId ? { ...re, ...changes } : re)))
  }

  const handleRemove = (exerciseId: string) => {
    setExercises((prev) => prev.filter((re) => re.exerciseId !== exerciseId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setExercises((prev) => {
      const oldIndex = prev.findIndex((re) => re.exerciseId === active.id)
      const newIndex = prev.findIndex((re) => re.exerciseId === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const handleSave = async () => {
    if (!canSave) return
    if (isEdit && id) {
      await updateRoutine(id, { name: name.trim(), exercises })
      navigate(`/workouts/${id}`)
    } else {
      const newId = await createRoutine(name.trim(), exercises)
      navigate(`/workouts/${newId}`)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteRoutine(id)
    navigate('/workouts')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title={isEdit ? 'Edit Routine' : 'New Routine'} />
      <div className="flex-1 scroll-touch space-y-5 px-4 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push A" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Exercises</label>
          {exercises.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-slate-500">
              No exercises yet.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={exercises.map((re) => re.exerciseId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {exercises.map((re) => (
                    <RoutineExerciseRow
                      key={re.exerciseId}
                      routineExercise={re}
                      exercise={exerciseById.get(re.exerciseId)}
                      onChange={(changes) => handleChange(re.exerciseId, changes)}
                      onRemove={() => handleRemove(re.exerciseId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-slate-400 active:bg-surface-1"
          >
            <Plus size={16} />
            Add Exercise
          </button>
        </div>

        <div className="space-y-2 pt-2">
          <Button fullWidth onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
          {isEdit && (
            <Button fullWidth variant="danger" onClick={handleDelete}>
              Delete Routine
            </Button>
          )}
        </div>
      </div>

      {showPicker && (
        <ExercisePickerSheet
          title="Add Exercise"
          onPick={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
