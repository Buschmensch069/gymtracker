import { useRef, useState } from 'react'
import { StepperButton } from '../../components/ui/Stepper'

interface WeightRepsInputProps {
  value: number
  onChange: (value: number) => void
  step: number
  decimals?: 0 | 1
  inputMode?: 'numeric' | 'decimal'
  min?: number
  boxWidthClass?: string
  ariaLabel: string
  /** Whether `value` is a real user-entered number. When false the field is empty and shows `placeholder` greyed out. */
  touched?: boolean
  /** Last session's value for this field, shown as the greyed placeholder while untouched. */
  placeholder?: number
  /** Narrower +/- buttons, for the packed active-workout row. */
  compact?: boolean
}

/**
 * Editable numeral flanked by +/- steppers. Steppers avoid the keyboard
 * entirely for small adjustments (the common case mid-set); the field itself
 * is a real `<input>` at all times for big jumps.
 *
 * **It must never be a button that swaps to an input on tap.** That is what it
 * used to be, and it cost a tap on every single set: React commits the swap,
 * then the new input is focused from a `requestAnimationFrame` — by which
 * point iOS no longer considers itself inside the user gesture, so it moved
 * the caret but refused to raise the keyboard. A permanently-mounted input
 * gets focus and the keyboard from the browser's own tap handling, with no JS
 * involved and nothing to get the timing wrong.
 *
 * While untouched the field renders **empty** with the last-session value as
 * its placeholder, rather than a real "0". A rendered 0 has to be cleared
 * before every entry, and (being a legitimate value for bodyweight work) it
 * cannot be distinguished from a real one by looking at it.
 */
export function WeightRepsInput({
  value,
  onChange,
  step,
  decimals = 0,
  inputMode = 'numeric',
  min = 0,
  boxWidthClass = 'w-16',
  ariaLabel,
  touched = true,
  placeholder,
  compact,
}: WeightRepsInputProps) {
  // Non-null only while focused: a local draft lets a half-typed "12." stand
  // without being round-tripped through the stored number. Out of focus the
  // props are the single source of truth, so a stepper tap or an edit made
  // anywhere else shows up immediately.
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // The base a +/- tap starts from — the last-session value while untouched
  // (so the first nudge confirms it, rather than starting from 0), the real
  // stored value once touched.
  const base = !touched && placeholder !== undefined ? placeholder : value
  const committed = touched ? formatValue(value, decimals) : ''

  const round = (n: number) => {
    const factor = 10 ** decimals
    return Math.round(n * factor) / factor
  }

  const commit = (raw: string) => {
    const parsed = parseFloat(raw)
    // An empty (or mid-edit "-"/".") field commits nothing: clearing the box
    // is how you retype it, not how you set it to zero.
    if (Number.isNaN(parsed)) return
    onChange(Math.max(min, round(parsed)))
  }

  const selectAll = () => {
    const input = inputRef.current
    if (!input || document.activeElement !== input) return
    input.select()
  }

  return (
    <div className="flex items-center gap-1">
      <StepperButton compact={compact} label={`Decrease ${ariaLabel}`} onStep={() => onChange(Math.max(min, round(base - step)))}>
        −
      </StepperButton>

      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        pattern={inputMode === 'decimal' ? '[0-9]*\\.?[0-9]*' : '[0-9]*'}
        enterKeyHint="done"
        aria-label={ariaLabel}
        value={draft ?? committed}
        placeholder={formatValue(placeholder ?? 0, decimals)}
        onFocus={() => {
          setDraft(committed)
          // Selected so the first keypress replaces the set's value instead of
          // appending to it. Done again a frame later because iOS places the
          // caret from the tap *after* focus fires and would otherwise undo it.
          selectAll()
          requestAnimationFrame(selectAll)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          // Committed per keystroke, not on blur: a set typed and then
          // interrupted (phone locks, app is swapped out) is still logged.
          commit(e.target.value)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
        className={`h-11 ${boxWidthClass} rounded-xl bg-surface-1 text-center font-mono text-xl tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent`}
      />

      <StepperButton compact={compact} label={`Increase ${ariaLabel}`} onStep={() => onChange(Math.max(min, round(base + step)))}>
        +
      </StepperButton>
    </div>
  )
}

function formatValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}
