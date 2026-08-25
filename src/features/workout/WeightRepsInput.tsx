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
}: WeightRepsInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing])

  const startEditing = () => {
    setDraft(formatValue(value, decimals))
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

  const clampedStep = (delta: number) => onChange(Math.max(min, round(value + delta)))

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
          className={`h-11 ${boxWidthClass} rounded-xl border border-cyan-500 bg-slate-900 text-center font-mono text-xl tabular-nums text-slate-100 focus:outline-none`}
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className={`h-11 ${boxWidthClass} rounded-xl bg-slate-900 text-center font-mono text-xl tabular-nums text-slate-100`}
        >
          {formatValue(value, decimals)}
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
