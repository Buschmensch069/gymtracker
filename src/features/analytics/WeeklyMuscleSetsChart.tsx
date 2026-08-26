import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeWeeklyMuscleSets } from '../../lib/analytics'
import { CHART_AXIS_TICK, CHART_GRID, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import { CHART_MUSCLE_PRIORITY, CHART_OTHER_COLOR, CHART_OTHER_LABEL, MUSCLE_COLORS } from '../../lib/muscleColors'
import { type AnalyticsTimeRange, weekCountForRange } from '../../lib/timeRange'
import { MUSCLE_LABELS, type PrimaryMuscle } from '../../db/types'
import { Chip } from '../../components/ui/Chip'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

type GroupMode = 'muscle' | 'upperLower' | 'pushPullLegs'

const GROUP_MODE_OPTIONS: { value: GroupMode; label: string }[] = [
  { value: 'muscle', label: 'By Muscle' },
  { value: 'upperLower', label: 'Upper / Lower' },
  { value: 'pushPullLegs', label: 'Push / Pull / Legs' },
]

/** Reuses already-palette-validated muscle hues as stand-ins for the coarser grouped categories, rather than inventing new ones. */
const UPPER_LOWER_GROUPS: Record<PrimaryMuscle, string> = {
  chest: 'Upper', back: 'Upper', shoulders: 'Upper', biceps: 'Upper', triceps: 'Upper', forearms: 'Upper',
  quadriceps: 'Lower', hamstrings: 'Lower', glutes: 'Lower', calves: 'Lower',
  core: 'Other', cardio: 'Other', fullBody: 'Other',
}
const UPPER_LOWER_COLORS: Record<string, string> = {
  Upper: MUSCLE_COLORS.shoulders,
  Lower: MUSCLE_COLORS.quadriceps,
  Other: CHART_OTHER_COLOR,
}
const UPPER_LOWER_ORDER = ['Upper', 'Lower', 'Other']

const PUSH_PULL_LEGS_GROUPS: Record<PrimaryMuscle, string> = {
  chest: 'Push', shoulders: 'Push', triceps: 'Push',
  back: 'Pull', biceps: 'Pull', forearms: 'Pull',
  quadriceps: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  core: 'Other', cardio: 'Other', fullBody: 'Other',
}
const PUSH_PULL_LEGS_COLORS: Record<string, string> = {
  Push: MUSCLE_COLORS.chest,
  Pull: MUSCLE_COLORS.back,
  Legs: MUSCLE_COLORS.quadriceps,
  Other: CHART_OTHER_COLOR,
}
const PUSH_PULL_LEGS_ORDER = ['Push', 'Pull', 'Legs', 'Other']

export function WeeklyMuscleSetsChart({
  data,
  range,
  earliestTimestamp,
}: {
  data: AnalyticsData
  range: AnalyticsTimeRange
  earliestTimestamp: number | undefined
}) {
  const [groupMode, setGroupMode] = useState<GroupMode>('muscle')
  const [hiddenMuscles, setHiddenMuscles] = useState<Set<PrimaryMuscle>>(new Set())

  const weekCount = weekCountForRange(range, earliestTimestamp)
  const weeks = computeWeeklyMuscleSets(data.setLogs, data.exerciseById, weekCount)

  const musclesPresent = new Set<PrimaryMuscle>()
  for (const week of weeks) {
    for (const muscle of Object.keys(week.totals) as PrimaryMuscle[]) {
      if (week.totals[muscle]) musclesPresent.add(muscle)
    }
  }
  if (musclesPresent.size === 0) {
    return <EmptyChart message="Log some working sets to see weekly volume by muscle group." />
  }

  const priorityMusclesPresent = CHART_MUSCLE_PRIORITY.filter((m) => musclesPresent.has(m))

  let seriesKeys: string[]
  let colorOf: Record<string, string>
  let rows: Record<string, number | string>[]

  if (groupMode === 'muscle') {
    const hasOther = [...musclesPresent].some((m) => !CHART_MUSCLE_PRIORITY.includes(m))
    const visibleMuscles = priorityMusclesPresent.filter((m) => !hiddenMuscles.has(m))
    seriesKeys = hasOther ? [...visibleMuscles, CHART_OTHER_LABEL] : visibleMuscles
    colorOf = { ...MUSCLE_COLORS, [CHART_OTHER_LABEL]: CHART_OTHER_COLOR }
    rows = weeks.map((week) => {
      const row: Record<string, number | string> = { label: week.label }
      for (const muscle of visibleMuscles) row[muscle] = round1(week.totals[muscle] ?? 0)
      if (hasOther) {
        let other = 0
        for (const [muscle, value] of Object.entries(week.totals)) {
          if (!CHART_MUSCLE_PRIORITY.includes(muscle as PrimaryMuscle)) other += value ?? 0
        }
        row[CHART_OTHER_LABEL] = round1(other)
      }
      return row
    })
  } else {
    const groupOf = groupMode === 'upperLower' ? UPPER_LOWER_GROUPS : PUSH_PULL_LEGS_GROUPS
    colorOf = groupMode === 'upperLower' ? UPPER_LOWER_COLORS : PUSH_PULL_LEGS_COLORS
    const order = groupMode === 'upperLower' ? UPPER_LOWER_ORDER : PUSH_PULL_LEGS_ORDER
    const groupsPresent = new Set<string>()
    for (const muscle of musclesPresent) groupsPresent.add(groupOf[muscle])
    seriesKeys = order.filter((g) => groupsPresent.has(g))
    rows = weeks.map((week) => {
      const row: Record<string, number | string> = { label: week.label }
      for (const key of seriesKeys) row[key] = 0
      for (const [muscle, value] of Object.entries(week.totals) as [PrimaryMuscle, number][]) {
        const group = groupOf[muscle]
        row[group] = round1((Number(row[group]) || 0) + (value ?? 0))
      }
      return row
    })
  }

  if (seriesKeys.length === 0) {
    return <EmptyChart message="No muscle groups selected — tap a chip below to show one." />
  }

  const lastKey = seriesKeys[seriesKeys.length - 1]

  const toggleMuscle = (muscle: PrimaryMuscle) => {
    setHiddenMuscles((prev) => {
      const next = new Set(prev)
      if (next.has(muscle)) next.delete(muscle)
      else next.add(muscle)
      return next
    })
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {GROUP_MODE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={groupMode === opt.value}
            onClick={() => setGroupMode(opt.value)}
          />
        ))}
      </div>

      {groupMode === 'muscle' && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Chip label="All" active={hiddenMuscles.size === 0} onClick={() => setHiddenMuscles(new Set())} />
          {priorityMusclesPresent.map((muscle) => (
            <Chip
              key={muscle}
              label={MUSCLE_LABELS[muscle]}
              color={MUSCLE_COLORS[muscle]}
              active={!hiddenMuscles.has(muscle)}
              onClick={() => toggleMuscle(muscle)}
            />
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
          <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{MUSCLE_LABELS[value as PrimaryMuscle] ?? value}</span>
            )}
            iconSize={9}
            iconType="circle"
          />
          {seriesKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              stackId="muscles"
              fill={colorOf[key]}
              stroke={'#0b0f14'}
              strokeWidth={2}
              maxBarSize={24}
              radius={key === lastKey ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
