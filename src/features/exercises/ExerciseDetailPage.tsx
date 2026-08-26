import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../db/types'
import { useExercise } from './useExercises'

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const exercise = useExercise(id)

  if (!exercise) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={exercise.name}
        action={
          // Editable regardless of isCustom — seeded exercises can be
          // mistagged too (e.g. a fuzzy import match landing on the wrong
          // muscle/equipment), and there's no other way to correct that.
          // Deleting stays restricted to custom exercises, in the form page.
          <Link to={`/exercises/${exercise.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />
      <div className="flex-1 scroll-touch space-y-4 px-4 py-4">
        <Row label="Primary muscle" value={MUSCLE_LABELS[exercise.primaryMuscle]} />
        <Row
          label="Secondary muscles"
          value={
            exercise.secondaryMuscles.length
              ? exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')
              : 'None'
          }
        />
        <Row label="Equipment" value={EQUIPMENT_LABELS[exercise.equipment]} />
        {exercise.notes && <Row label="Notes" value={exercise.notes} />}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-slate-100">{value}</p>
    </div>
  )
}
