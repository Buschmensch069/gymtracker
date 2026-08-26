import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeWorkoutsPerWeek } from '../../lib/analytics'
import { CHART_ACCENT, CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

const WEEK_COUNT = 12

export function ConsistencyChart({ data }: { data: AnalyticsData }) {
  const weeks = computeWorkoutsPerWeek(data.workouts, WEEK_COUNT)

  if (weeks.every((w) => w.count === 0)) {
    return <EmptyChart message="Finish a few workouts to see your weekly consistency here." />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={weeks} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          formatter={(value) => [`${value} workout${value === 1 ? '' : 's'}`, 'Workouts']}
        />
        <Bar dataKey="count" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
