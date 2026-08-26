import { startOfWeek } from './dates'

/** Shared lookback window for the Analytics tab's charts. */
export type AnalyticsTimeRange = '8w' | '6m' | '1y' | 'all'

export const TIME_RANGE_OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: '8w', label: '8 Weeks' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All' },
]

const MS_PER_WEEK = 7 * 86_400_000

/**
 * Week-count lookback for a given range, for the week-bucketed charts
 * (Weekly Sets, Consistency, weekly Tonnage). "all" is measured from the
 * earliest known workout/set timestamp, if any.
 */
export function weekCountForRange(range: AnalyticsTimeRange, earliestTimestamp: number | undefined): number {
  switch (range) {
    case '8w':
      return 8
    case '6m':
      return 26
    case '1y':
      return 52
    case 'all': {
      if (earliestTimestamp === undefined) return 8
      const weeks = Math.ceil((startOfWeek(Date.now()) - startOfWeek(earliestTimestamp)) / MS_PER_WEEK) + 1
      return Math.max(1, weeks)
    }
  }
}

/** Start-of-range timestamp for filtering raw (non-week-bucketed) data, e.g. per-workout Tonnage or E1RM. */
export function startTimestampForRange(range: AnalyticsTimeRange, earliestTimestamp: number | undefined): number {
  if (range === 'all') return earliestTimestamp ?? 0
  const weekCount = weekCountForRange(range, earliestTimestamp)
  return startOfWeek(Date.now()) - (weekCount - 1) * MS_PER_WEEK
}
