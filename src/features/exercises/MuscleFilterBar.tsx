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
          active={value === muscle}
          onClick={() => onChange(muscle)}
        />
      ))}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
        active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
