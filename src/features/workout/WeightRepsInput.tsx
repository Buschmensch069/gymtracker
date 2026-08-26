import { useEffect, useRef, useState } from 'react'
import { StepperButton } from '../../components/ui/Stepper'

interface WeightRepsInputProps {
  value: number
  onChange: (value: number) => void
  step: number
  decimals?: 0 | 1
  inputMode?: 'numeric' | 'decimal'
  min?: number
  boxWidthClass?: string
  /** Whether `value` is a real user-entered number. When false, `placeholder` (if given) is shown greyed out instead. */
  touched?: boolean
  /** Last session's value for this field, shown as greyed placeholder text while untouched. */
  placeholder?: number
}

/**
 * Large tap-to-edit numeral flanked by +/- steppers. Steppers avoid the
 * keyboard entirely for small adjustments (the common case mid-set);
 * tapping the number opens direct text entry for big jumps.
 */
export function WeightRepsInput({
  value,
  onChange,
  step,
  decimals = 0,
  inputMode = 'numeric',
  min = 0,
  boxWidthClass = 'w-16',
  touched = true,
  placeholder,
}: WeightRepsInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const showPlaceholder = !touched && placeholder !== undefined
  // The base a +/- tap or a tap-to-edit starts from — the last-session value
  // while untouched (so the first interaction nudges/confirms it, rather
  // than starting from the 0 default), the real stored value once touched.
  const base = showPlaceholder ? placeholder : value

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing])

  const startEditing = () => {
    setDraft(formatValue(base, decimals))
    setEditing(true)
  }

  const round = (n: number) => {
    const factor = 10 ** decimals
    return Math.round(n * factor) / factor
  }

  const commit = () => {
    const parsed = parseFloat(draft)
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, round(parsed)))
    }
    setEditing(false)
  }

  const clampedStep = (delta: number) => onChange(Math.max(min, round(base + delta)))

  return (
    <div className="flex items-center gap-1">
      <StepperButton label="Decrease" onStep={() => clampedStep(-step)}>
        −
      </StepperButton>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          pattern={inputMode === 'decimal' ? '[0-9]*\\.?[0-9]*' : '[0-9]*'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className={`h-11 ${boxWidthClass} rounded-xl border border-accent bg-surface-1 text-center font-mono text-xl tabular-nums text-slate-100 focus:outline-none`}
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className={`h-11 ${boxWidthClass} rounded-xl bg-surface-1 text-center font-mono text-xl tabular-nums ${
            showPlaceholder ? 'text-slate-600' : 'text-slate-100'
          }`}
        >
          {formatValue(base, decimals)}
        </button>
      )}

      <StepperButton label="Increase" onStep={() => clampedStep(step)}>
        +
      </StepperButton>
    </div>
  )
}

function formatValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}
