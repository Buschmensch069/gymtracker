import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SetLog } from '../../db/types'
import { computeTonnage, computeWeeklyTonnage } from '../../lib/analytics'
import { CHART_ACCENT, CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { formatDate } from '../../lib/dates'
import { type AnalyticsTimeRange, startTimestampForRange, weekCountForRange } from '../../lib/timeRange'
import { weightForDisplay } from '../../lib/units'
import type { UnitPreference } from '../../db/types'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

/** Individual workout points are only readable at the shortest range — everything longer aggregates to weekly totals. */
const PER_WORKOUT_RANGE: AnalyticsTimeRange = '8w'

export function TonnageChart({
  data,
  unit,
  range,
  earliestTimestamp,
}: {
  data: AnalyticsData
  unit: UnitPreference
  range: AnalyticsTimeRange
  earliestTimestamp: number | undefined
}) {
  const finished = data.workouts.filter((w) => w.finishedAt !== undefined)
  if (finished.length === 0) {
    return <EmptyChart message="Finish a workout to see tonnage trends here." />
  }

  if (range === PER_WORKOUT_RANGE) {
    return <PerWorkoutTonnage data={data} unit={unit} range={range} earliestTimestamp={earliestTimestamp} />
  }

  const weekCount = weekCountForRange(range, earliestTimestamp)
  const weeks = computeWeeklyTonnage(data.setLogs, data.workouts, weekCount)
  const rows = weeks.map((week) => ({
    label: week.label,
    tonnage: Math.round(weightForDisplay(week.tonnageKg, unit)),
  }))

  if (rows.every((r) => r.tonnage === 0)) {
    return <EmptyChart message="Finish a workout to see tonnage trends here." />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value: number) => value.toLocaleString()}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`, 'Tonnage']}
        />
        <Bar dataKey="tonnage" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PerWorkoutTonnage({
  data,
  unit,
  range,
  earliestTimestamp,
}: {
  data: AnalyticsData
  unit: UnitPreference
  range: AnalyticsTimeRange
  earliestTimestamp: number | undefined
}) {
  const startTs = startTimestampForRange(range, earliestTimestamp)
  const finished = data.workouts
    .filter((w) => w.finishedAt !== undefined && w.startedAt >= startTs)
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
      <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value: number) => value.toLocaleString()}
        />
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
