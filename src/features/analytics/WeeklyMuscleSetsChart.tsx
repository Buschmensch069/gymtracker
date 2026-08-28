import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { computeWeeklyMuscleSets } from '../../lib/analytics'
import { CHART_AXIS_TICK, CHART_GRID, CHART_MUTED_TEXT, CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import {
  CHART_MAX_MUSCLE_SERIES,
  CHART_MUSCLE_SERIES_ORDER,
  CHART_OTHER_COLOR,
  CHART_OTHER_LABEL,
  MUSCLE_COLORS,
} from '../../lib/muscleColors'
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
  core: CHART_OTHER_LABEL, cardio: CHART_OTHER_LABEL, fullBody: CHART_OTHER_LABEL,
}
const UPPER_LOWER_COLORS: Record<string, string> = {
  Upper: MUSCLE_COLORS.shoulders,
  Lower: MUSCLE_COLORS.quadriceps,
  [CHART_OTHER_LABEL]: CHART_OTHER_COLOR,
}
const UPPER_LOWER_ORDER = ['Upper', 'Lower', CHART_OTHER_LABEL]

const PUSH_PULL_LEGS_GROUPS: Record<PrimaryMuscle, string> = {
  chest: 'Push', shoulders: 'Push', triceps: 'Push',
  back: 'Pull', biceps: 'Pull', forearms: 'Pull',
  quadriceps: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  core: CHART_OTHER_LABEL, cardio: CHART_OTHER_LABEL, fullBody: CHART_OTHER_LABEL,
}
const PUSH_PULL_LEGS_COLORS: Record<string, string> = {
  Push: MUSCLE_COLORS.chest,
  Pull: MUSCLE_COLORS.back,
  Legs: MUSCLE_COLORS.quadriceps,
  [CHART_OTHER_LABEL]: CHART_OTHER_COLOR,
}
const PUSH_PULL_LEGS_ORDER = ['Push', 'Pull', 'Legs', CHART_OTHER_LABEL]

/**
 * Per-week breakdown of what the grey "Other" bar is made of, carried on the
 * chart row so the tooltip can name it instead of leaving an unexplained
 * segment. Prefixed and non-numeric so it can never be read as a Bar dataKey.
 */
const OTHER_PARTS_KEY = '__otherParts'

interface OtherPart {
  label: string
  value: number
}

type ChartRow = Record<string, number | string | OtherPart[] | undefined>

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
  /** Filter-IN: tapping a chip selects that muscle. An empty set means "All". */
  const [selectedMuscles, setSelectedMuscles] = useState<Set<PrimaryMuscle>>(new Set())

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

  const chipMuscles = CHART_MUSCLE_SERIES_ORDER.filter((m) => musclesPresent.has(m))
  // Filter first, fold second. Folding to "Other" over the unfiltered set would
  // put muscles the user just excluded back on the chart as a grey segment.
  const activeMuscles =
    selectedMuscles.size === 0 ? chipMuscles : chipMuscles.filter((m) => selectedMuscles.has(m))

  let seriesKeys: string[]
  let colorOf: Record<string, string>
  let rows: ChartRow[]

  if (groupMode === 'muscle') {
    // Overflow past the 8 stackable series folds into "Other" — so a selection
    // of 8 or fewer muscles always renders as exactly that many named series.
    const namedMuscles = activeMuscles.slice(0, CHART_MAX_MUSCLE_SERIES)
    const foldedMuscles = activeMuscles.slice(CHART_MAX_MUSCLE_SERIES)
    seriesKeys = foldedMuscles.length > 0 ? [...namedMuscles, CHART_OTHER_LABEL] : namedMuscles
    colorOf = { ...MUSCLE_COLORS, [CHART_OTHER_LABEL]: CHART_OTHER_COLOR }
    rows = weeks.map((week) => {
      const row: ChartRow = { label: week.label }
      for (const muscle of namedMuscles) row[muscle] = round1(week.totals[muscle] ?? 0)
      if (foldedMuscles.length > 0) {
        let other = 0
        const parts: OtherPart[] = []
        for (const muscle of foldedMuscles) {
          const value = week.totals[muscle] ?? 0
          if (!value) continue
          other += value
          parts.push({ label: MUSCLE_LABELS[muscle], value: round1(value) })
        }
        row[CHART_OTHER_LABEL] = round1(other)
        row[OTHER_PARTS_KEY] = parts
      }
      return row
    })
  } else {
    // The muscle chips are hidden in the grouped modes, so the selection isn't
    // applied here — an invisible control shouldn't silently drop data.
    const groupOf = groupMode === 'upperLower' ? UPPER_LOWER_GROUPS : PUSH_PULL_LEGS_GROUPS
    colorOf = groupMode === 'upperLower' ? UPPER_LOWER_COLORS : PUSH_PULL_LEGS_COLORS
    const order = groupMode === 'upperLower' ? UPPER_LOWER_ORDER : PUSH_PULL_LEGS_ORDER
    const groupsPresent = new Set<string>()
    for (const muscle of musclesPresent) groupsPresent.add(groupOf[muscle])
    seriesKeys = order.filter((g) => groupsPresent.has(g))
    rows = weeks.map((week) => {
      const row: ChartRow = { label: week.label }
      for (const key of seriesKeys) row[key] = 0
      const parts: OtherPart[] = []
      for (const [muscle, value] of Object.entries(week.totals) as [PrimaryMuscle, number][]) {
        const group = groupOf[muscle]
        row[group] = round1((Number(row[group]) || 0) + (value ?? 0))
        if (group === CHART_OTHER_LABEL && value) {
          parts.push({ label: MUSCLE_LABELS[muscle], value: round1(value) })
        }
      }
      row[OTHER_PARTS_KEY] = parts
      return row
    })
  }

  const lastKey = seriesKeys[seriesKeys.length - 1]

  const toggleMuscle = (muscle: PrimaryMuscle) => {
    setSelectedMuscles((prev) => {
      const next = new Set(prev)
      if (next.has(muscle)) next.delete(muscle)
      else next.add(muscle)
      return next
    })
  }

  const renderTooltip = ({ active, payload, label }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload as ChartRow | undefined
    const otherParts = (row?.[OTHER_PARTS_KEY] as OtherPart[] | undefined) ?? []
    // Stacks render bottom-up; reverse so the list order matches the eye.
    const entries = payload.filter((entry) => Number(entry.value) > 0).reverse()
    if (entries.length === 0) return null
    const total = round1(entries.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0))

    return (
      // Up to 9 series plus the "Other" breakdown line has to fit inside a
      // 260px-tall chart on a phone, so the total rides in the header rather
      // than taking a bordered row of its own.
      <div style={{ ...CHART_TOOLTIP_STYLE, padding: '7px 9px', minWidth: 140, lineHeight: 1.35 }}>
        <div className="mb-1 flex items-center gap-3">
          <span className="font-semibold">{label}</span>
          <span className="ml-auto tabular-nums" style={{ color: CHART_MUTED_TEXT }}>
            {total} total
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {entries.map((entry) => {
            const key = String(entry.dataKey ?? entry.name ?? '')
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color ?? colorOf[key] }}
                    aria-hidden="true"
                  />
                  <span>{MUSCLE_LABELS[key as PrimaryMuscle] ?? key}</span>
                  <span className="ml-auto pl-4 tabular-nums">{entry.value}</span>
                </div>
                {key === CHART_OTHER_LABEL && otherParts.length > 0 && (
                  <div className="ml-4 text-xs" style={{ color: CHART_MUTED_TEXT }}>
                    {otherParts.map((part) => `${part.label} ${part.value}`).join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
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
          <Chip label="All" active={selectedMuscles.size === 0} onClick={() => setSelectedMuscles(new Set())} />
          {chipMuscles.map((muscle) => (
            <Chip
              key={muscle}
              label={MUSCLE_LABELS[muscle]}
              color={MUSCLE_COLORS[muscle]}
              active={selectedMuscles.has(muscle)}
              onClick={() => toggleMuscle(muscle)}
            />
          ))}
        </div>
      )}

      {seriesKeys.length === 0 ? (
        <EmptyChart message="No sets logged for the selected muscle groups in this range." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
            <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
            <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: CHART_MUTED_TEXT, fontSize: 12 }}>
                  {MUSCLE_LABELS[value as PrimaryMuscle] ?? value}
                </span>
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
      )}
    </div>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
