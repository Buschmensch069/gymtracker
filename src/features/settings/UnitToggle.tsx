import { useUnitPreference } from '../../hooks/useSettings'

export function UnitToggle() {
  const [unit, setUnit] = useUnitPreference()

  return (
    <div className="flex overflow-hidden rounded-xl border border-border">
      {(['kg', 'lb'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setUnit(option)}
          className={`min-h-11 flex-1 text-sm font-medium uppercase ${
            unit === option ? 'bg-accent text-accent-fg' : 'bg-surface-1 text-slate-400'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
