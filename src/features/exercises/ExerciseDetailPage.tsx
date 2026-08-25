import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../db/types'
import { useExercise } from './useExercises'

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const exercise = useExercise(id)
  const navigate = useNavigate()

  if (!exercise) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title={exercise.name}
        action={
          exercise.isCustom ? (
            <Link to={`/exercises/${exercise.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          ) : (
            <button onClick={() => navigate(-1)} className="text-slate-400">
              Back
            </button>
          )
        }
      />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
