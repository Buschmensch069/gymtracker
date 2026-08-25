import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate, formatDuration, formatTime } from '../../lib/dates'
import { useFinishedWorkouts } from './useWorkoutHistory'

export function HistoryListPage() {
  const workouts = useFinishedWorkouts()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="History" />
      <div className="flex-1 overflow-y-auto">
        {workouts?.length === 0 && (
          <EmptyState title="No workouts yet" message="Finished workouts will show up here." />
        )}
        {workouts?.map((workout) => (
          <Link
            key={workout.id}
            to={`/history/${workout.id}`}
            className="flex min-h-14 items-center justify-between border-b border-slate-800 px-4 py-3 active:bg-slate-900"
          >
            <div>
              <p className="font-medium text-slate-100">{formatDate(workout.startedAt)}</p>
              <p className="text-sm text-slate-500">{formatTime(workout.startedAt)}</p>
            </div>
            <span className="text-sm text-slate-500">
              {formatDuration(workout.startedAt, workout.finishedAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
