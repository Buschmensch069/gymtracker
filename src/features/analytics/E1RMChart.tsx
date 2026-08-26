import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeE1RM, isWorkingSet } from '../../lib/analytics'
import { CHART_ACCENT, CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { formatDate } from '../../lib/dates'
import { type AnalyticsTimeRange, startTimestampForRange } from '../../lib/timeRange'
import { weightForDisplay } from '../../lib/units'
import type { UnitPreference } from '../../db/types'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

export function E1RMChart({
  data,
  exerciseId,
  unit,
  range,
  earliestTimestamp,
}: {
  data: AnalyticsData
  exerciseId: string
  unit: UnitPreference
  range: AnalyticsTimeRange
  earliestTimestamp: number | undefined
}) {
  const startTs = startTimestampForRange(range, earliestTimestamp)
  const sets = data.setLogs.filter(
    (s) => s.exerciseId === exerciseId && isWorkingSet(s) && s.timestamp >= startTs,
  )

  const bestByWorkout = new Map<string, { timestamp: number; e1rm: number }>()
  for (const set of sets) {
    const e1rm = computeE1RM(set.weightKg, set.reps)
    if (e1rm === null) continue
    const existing = bestByWorkout.get(set.workoutId)
    if (!existing || e1rm > existing.e1rm) {
      bestByWorkout.set(set.workoutId, { timestamp: set.timestamp, e1rm })
    }
  }

  const rows = Array.from(bestByWorkout.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((entry) => ({
      label: formatDate(entry.timestamp),
      e1rm: Math.round(weightForDisplay(entry.e1rm, unit)),
    }))

  if (rows.length === 0) {
    return (
      <EmptyChart message="Log sets of 12 reps or fewer for this exercise to see estimated 1RM trends (Epley's formula degrades badly above 12 reps)." />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${value} ${unit}`, 'Est. 1RM']}
        />
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_ACCENT, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
