import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ExercisePickerSheet } from '../exercises/ExercisePickerSheet'
import type { UnitPreference } from '../../db/types'
import type { AnalyticsTimeRange } from '../../lib/timeRange'
import { E1RMChart } from './E1RMChart'
import { EmptyChart } from './EmptyChart'
import type { AnalyticsData } from './useAnalyticsData'

export function ExerciseProgressSection({
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
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined)
  const [showPicker, setShowPicker] = useState(false)

  const exerciseName = exerciseId ? data.exerciseById.get(exerciseId)?.name : undefined

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-1 px-3 text-slate-100"
      >
        <span className={exerciseName ? 'font-medium' : 'text-slate-500'}>
          {exerciseName ?? 'Pick an exercise'}
        </span>
        <ChevronDown size={18} className="text-slate-500" />
      </button>

      {exerciseId ? (
        <E1RMChart
          data={data}
          exerciseId={exerciseId}
          unit={unit}
          range={range}
          earliestTimestamp={earliestTimestamp}
        />
      ) : (
        <EmptyChart message="Pick an exercise to see its estimated 1RM trend." />
      )}

      {showPicker && (
        <ExercisePickerSheet
          title="Choose Exercise"
          onPick={(id) => {
            setExerciseId(id)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
