import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SetLog } from '../../db/types'
import { computeTonnage } from '../../lib/analytics'
import { CHART_ACCENT, CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { formatDate } from '../../lib/dates'
import { weightForDisplay } from '../../lib/units'
import type { UnitPreference } from '../../db/types'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

export function TonnageChart({ data, unit }: { data: AnalyticsData; unit: UnitPreference }) {
  const finished = data.workouts
    .filter((w) => w.finishedAt !== undefined)
    .sort((a, b) => a.startedAt - b.startedAt)

  if (finished.length === 0) {
    return <EmptyChart message="Finish a workout to see tonnage trends here." />
  }

  const setsByWorkoutId = new Map<string, SetLog[]>()
  for (const set of data.setLogs) {
    const list = setsByWorkoutId.get(set.workoutId) ?? []
    list.push(set)
    setsByWorkoutId.set(set.workoutId, list)
  }

  const rows = finished.map((workout) => ({
    label: formatDate(workout.startedAt),
    tonnage: Math.round(weightForDisplay(computeTonnage(setsByWorkoutId.get(workout.id) ?? []), unit)),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`, 'Tonnage']}
        />
        <Line
          type="monotone"
          dataKey="tonnage"
          stroke={CHART_ACCENT}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_ACCENT, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
