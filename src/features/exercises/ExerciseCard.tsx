import { Link } from 'react-router-dom'
import type { Exercise } from '../../db/types'
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../db/types'

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="flex min-h-14 items-center justify-between border-b border-slate-800 px-4 py-3 active:bg-slate-900"
    >
      <div>
        <p className="font-medium text-slate-100">{exercise.name}</p>
        <p className="text-sm text-slate-500">
          {MUSCLE_LABELS[exercise.primaryMuscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
        </p>
      </div>
      {exercise.isCustom && (
        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
          Custom
        </span>
      )}
    </Link>
  )
}
