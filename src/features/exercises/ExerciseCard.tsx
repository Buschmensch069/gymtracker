import { Link } from 'react-router-dom'
import type { Exercise } from '../../db/types'
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../db/types'
import { MUSCLE_COLORS } from '../../lib/muscleColors'

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 active:bg-surface-1"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: MUSCLE_COLORS[exercise.primaryMuscle] }}
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="font-medium text-slate-100">{exercise.name}</p>
        <p className="text-sm text-slate-500">
          {MUSCLE_LABELS[exercise.primaryMuscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
        </p>
      </div>
      {exercise.isCustom && (
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-xs text-slate-400">
          Custom
        </span>
      )}
    </Link>
  )
}
