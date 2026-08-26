import { Chip } from '../../components/ui/Chip'
import { TIME_RANGE_OPTIONS, type AnalyticsTimeRange } from '../../lib/timeRange'

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: AnalyticsTimeRange
  onChange: (range: AnalyticsTimeRange) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TIME_RANGE_OPTIONS.map((opt) => (
        <Chip key={opt.value} label={opt.label} active={value === opt.value} onClick={() => onChange(opt.value)} />
      ))}
    </div>
  )
}
