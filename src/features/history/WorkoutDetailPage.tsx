import { useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDate, formatDuration, formatTime } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import { useWorkoutExercises } from '../workout/useActiveWorkout'
import { useWorkout } from './useWorkoutHistory'

export function WorkoutDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const workout = useWorkout(workoutId)
  const workoutExercises = useWorkoutExercises(workoutId)
  const [unit] = useUnitPreference()

  if (!workout) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title={formatDate(workout.startedAt)} />
      <div className="border-b border-slate-800 px-4 py-2 text-sm text-slate-500">
        {formatTime(workout.startedAt)} · {formatDuration(workout.startedAt, workout.finishedAt)}
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {workoutExercises?.map((we) => (
          <div key={we.id} className="mt-3 first:mt-0">
            <p className="px-4 py-2 font-semibold text-slate-100">{we.exercise?.name ?? 'Exercise'}</p>
            <div className="px-4">
              {we.sets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 border-b border-slate-900 py-2 text-sm"
                >
                  <span className="w-5 text-slate-500">{set.setNumber}</span>
                  <span className="text-slate-100">
                    {weightForDisplay(set.weightKg, unit)} {unit} × {set.reps}
                  </span>
                  {set.type !== 'normal' && (
                    <span className="text-xs text-slate-500 uppercase">{set.type}</span>
                  )}
                  {set.completed && <span className="ml-auto text-cyan-400">✓</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
