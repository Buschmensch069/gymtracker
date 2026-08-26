import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { computePRProgression } from '../../lib/analytics'
import { formatDate } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import type { UnitPreference } from '../../db/types'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

export function PRList({ data, unit }: { data: AnalyticsData; unit: UnitPreference }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const progression = computePRProgression(data.setLogs, data.exerciseById)

  const rows = Array.from(progression.byExercise.entries())
    .map(([exerciseId, snapshot]) => ({
      exerciseId,
      name: data.exerciseById.get(exerciseId)?.name ?? 'Exercise',
      snapshot,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (rows.length === 0) {
    return <EmptyChart message="Log a few working sets to start tracking personal records." />
  }

  return (
    <div className="space-y-2">
      {rows.map(({ exerciseId, name, snapshot }) => {
        const isOpen = expanded === exerciseId
        const repRows = Array.from(snapshot.bestByReps.entries()).sort((a, b) => a[0] - b[0])

        return (
          <Card key={exerciseId} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : exerciseId)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium text-slate-100">{name}</p>
                {snapshot.bestE1RM ? (
                  <p className="font-mono text-sm tabular-nums text-slate-500">
                    Est. 1RM {Math.round(weightForDisplay(snapshot.bestE1RM.value, unit))} {unit} ·{' '}
                    {formatDate(snapshot.bestE1RM.date)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No estimated 1RM yet (needs a set of ≤12 reps)</p>
                )}
              </div>
              {isOpen ? (
                <ChevronUp size={18} className="shrink-0 text-slate-500" />
              ) : (
                <ChevronDown size={18} className="shrink-0 text-slate-500" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-2">
                {repRows.map(([reps, best]) => (
                  <div key={reps} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-slate-400">{reps} rep{reps === 1 ? '' : 's'}</span>
                    <span className="font-mono tabular-nums text-slate-100">
                      {Math.round(weightForDisplay(best.weightKg, unit) * 10) / 10} {unit}
                    </span>
                    <span className="text-slate-500">{formatDate(best.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
