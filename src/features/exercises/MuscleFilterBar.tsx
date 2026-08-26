import { Chip } from '../../components/ui/Chip'
import { MUSCLE_COLORS } from '../../lib/muscleColors'
import { PRIMARY_MUSCLES, MUSCLE_LABELS, type PrimaryMuscle } from '../../db/types'

interface MuscleFilterBarProps {
  value: PrimaryMuscle | null
  onChange: (muscle: PrimaryMuscle | null) => void
}

export function MuscleFilterBar({ value, onChange }: MuscleFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      <Chip label="All" active={value === null} onClick={() => onChange(null)} />
      {PRIMARY_MUSCLES.map((muscle) => (
        <Chip
          key={muscle}
          label={MUSCLE_LABELS[muscle]}
          color={MUSCLE_COLORS[muscle]}
          active={value === muscle}
          onClick={() => onChange(muscle)}
        />
      ))}
    </div>
  )
}
