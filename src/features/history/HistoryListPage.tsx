import { Link } from 'react-router-dom'
import { History as HistoryIcon, Trophy } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { useUnitPreference } from '../../hooks/useSettings'
import { formatDate, formatDuration, formatTime } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import { useHistoryFeed, type HistoryWorkoutEntry } from './useHistoryFeed'
import type { ExerciseLineData } from './workoutStats'
import type { UnitPreference } from '../../db/types'

export function HistoryListPage() {
  const feed = useHistoryFeed()
  const [unit] = useUnitPreference()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="History" />
      <div className="flex-1 scroll-touch">
        {feed?.length === 0 && (
          <EmptyState
            icon={<HistoryIcon size={40} />}
            title="No workouts yet"
            message="Finished workouts will show up here."
          />
        )}
        {feed?.map((group) => (
          <div key={group.monthStart} className="px-4 pt-5 first:pt-4">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">{group.label}</h2>
            <div className="space-y-3">
              {group.entries.map((entry) => (
                <HistoryCard key={entry.workout.id} entry={entry} unit={unit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryCard({ entry, unit }: { entry: HistoryWorkoutEntry; unit: UnitPreference }) {
  const { workout, routineName, summary, prCount } = entry

  return (
    <Link to={`/history/${workout.id}`} className="block">
      <Card className="p-4 active:bg-surface-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-100">{routineName ?? 'Freeform'}</p>
            <p className="text-sm text-slate-500">
              {formatDate(workout.startedAt)} · {formatTime(workout.startedAt)}
            </p>
          </div>
          {prCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-amber-400">
              <Trophy size={13} />
              {prCount} PR{prCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 font-mono text-sm tabular-nums text-slate-400">
          <span>{formatDuration(workout.startedAt, workout.finishedAt)}</span>
          <span>
            {Math.round(weightForDisplay(summary.totalVolumeKg, unit)).toLocaleString()} {unit}
          </span>
          <span>
            {summary.totalSets} set{summary.totalSets === 1 ? '' : 's'}
          </span>
        </div>

        {summary.exerciseLines.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-slate-400">
            {summary.exerciseLines.map((line) => (
              <ExerciseLine key={line.exerciseId} line={line} unit={unit} />
            ))}
          </div>
        )}
      </Card>
    </Link>
  )
}

function ExerciseLine({ line, unit }: { line: ExerciseLineData; unit: UnitPreference }) {
  const weight = weightForDisplay(line.weightKg, unit)
  return (
    <p className="truncate">
      <span className="text-slate-300">{line.exerciseName}</span>{' '}
      {line.uniform ? (
        <span className="tabular-nums">
          {line.setCount}×{line.reps} @ {weight}
          {unit}
        </span>
      ) : (
        <span className="tabular-nums">
          {line.setCount} sets, top {weight}
          {unit}×{line.reps}
        </span>
      )}
    </p>
  )
}
