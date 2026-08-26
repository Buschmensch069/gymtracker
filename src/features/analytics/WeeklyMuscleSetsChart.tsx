import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeWeeklyMuscleSets } from '../../lib/analytics'
import { CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { CHART_MUSCLE_PRIORITY, CHART_OTHER_COLOR, CHART_OTHER_LABEL, MUSCLE_COLORS } from '../../lib/muscleColors'
import { MUSCLE_LABELS, type PrimaryMuscle } from '../../db/types'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

const WEEK_COUNT = 8

export function WeeklyMuscleSetsChart({ data }: { data: AnalyticsData }) {
  const weeks = computeWeeklyMuscleSets(data.setLogs, data.exerciseById, WEEK_COUNT)

  const musclesPresent = new Set<PrimaryMuscle>()
  for (const week of weeks) {
    for (const muscle of Object.keys(week.totals) as PrimaryMuscle[]) {
      if (week.totals[muscle]) musclesPresent.add(muscle)
    }
  }
  if (musclesPresent.size === 0) {
    return <EmptyChart message="Log some working sets to see weekly volume by muscle group." />
  }

  const seriesMuscles = CHART_MUSCLE_PRIORITY.filter((m) => musclesPresent.has(m))
  const hasOther = [...musclesPresent].some((m) => !CHART_MUSCLE_PRIORITY.includes(m))

  const rows = weeks.map((week) => {
    const row: Record<string, number | string> = { label: week.label }
    for (const muscle of seriesMuscles) row[muscle] = round1(week.totals[muscle] ?? 0)
    if (hasOther) {
      let other = 0
      for (const [muscle, value] of Object.entries(week.totals)) {
        if (!CHART_MUSCLE_PRIORITY.includes(muscle as PrimaryMuscle)) other += value ?? 0
      }
      row[CHART_OTHER_LABEL] = round1(other)
    }
    return row
  })

  const lastKey = hasOther ? CHART_OTHER_LABEL : seriesMuscles[seriesMuscles.length - 1]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {MUSCLE_LABELS[value as PrimaryMuscle] ?? value}
            </span>
          )}
          iconSize={9}
          iconType="circle"
        />
        {seriesMuscles.map((muscle) => (
          <Bar
            key={muscle}
            dataKey={muscle}
            name={muscle}
            stackId="muscles"
            fill={MUSCLE_COLORS[muscle]}
            stroke={'#0b0f14'}
            strokeWidth={2}
            maxBarSize={24}
            radius={muscle === lastKey ? [4, 4, 0, 0] : undefined}
          />
        ))}
        {hasOther && (
          <Bar
            dataKey={CHART_OTHER_LABEL}
            name={CHART_OTHER_LABEL}
            stackId="muscles"
            fill={CHART_OTHER_COLOR}
            stroke={'#0b0f14'}
            strokeWidth={2}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
