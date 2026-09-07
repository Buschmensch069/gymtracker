import { useRef, useState } from 'react'
import { StepperButton } from '../../components/ui/Stepper'
import { formatDecimal, parseDecimal, roundTo, sanitizeDecimalInput } from '../../lib/decimal'

interface WeightRepsInputProps {
  value: number
  onChange: (value: number) => void
  step: number
  /** Decimal places the field accepts and shows. 0 makes it an integer field (reps). */
  maxDecimals?: number
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
 *
 * Text in and out of the box goes through `src/lib/decimal.ts` — never
 * `parseFloat`, which reads "6,25" as 6 and drops the rest without a word.
 */
export function WeightRepsInput({
  value,
  onChange,
  step,
  maxDecimals = 0,
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
  const committed = touched ? formatDecimal(value, maxDecimals) : ''

  const commit = (raw: string) => {
    const parsed = parseDecimal(raw)
    // An empty (or mid-edit "."/"6.") field commits nothing: clearing the box
    // is how you retype it, not how you set it to zero.
    if (parsed === null) return
    onChange(Math.max(min, roundTo(parsed, maxDecimals)))
  }

  const stepBy = (delta: number) => onChange(Math.max(min, roundTo(base + delta, maxDecimals)))

  const selectAll = () => {
    const input = inputRef.current
    if (!input || document.activeElement !== input) return
    input.select()
  }

  return (
    <div className="flex items-center gap-1">
      <StepperButton compact={compact} label={`Decrease ${ariaLabel}`} onStep={() => stepBy(-step)}>
        −
      </StepperButton>

      {/* pattern allows both separators — either key may be what the keypad offers. */}
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        pattern={maxDecimals > 0 ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
        enterKeyHint="done"
        aria-label={ariaLabel}
        value={draft ?? committed}
        placeholder={formatDecimal(placeholder ?? 0, maxDecimals)}
        onFocus={() => {
          setDraft(committed)
          // Selected so the first keypress replaces the set's value instead of
          // appending to it. Done again a frame later because iOS places the
          // caret from the tap *after* focus fires and would otherwise undo it.
          selectAll()
          requestAnimationFrame(selectAll)
        }}
        onChange={(e) => {
          // Sanitised before it is shown, so the box can only ever hold a
          // number this field is willing to store — one separator, in "."
          // form whichever key the keypad sent, and no more decimals than
          // get saved. Nothing shifts under the caret later.
          const next = sanitizeDecimalInput(e.target.value, maxDecimals)
          // A *rejected* keystroke leaves `next` equal to the draft already
          // in state, so React sees no change, doesn't re-render, and leaves
          // the raw text sitting in the DOM — the second "." of "6.." would
          // stay visible even though the field's value is "6.". Writing the
          // sanitised text straight back to the node re-syncs it (and the
          // value tracker with it, so the next keystroke still fires change).
          if (e.target.value !== next) e.target.value = next
          setDraft(next)
          // Committed per keystroke, not on blur: a set typed and then
          // interrupted (phone locks, app is swapped out) is still logged.
          commit(next)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
        className={`h-11 ${boxWidthClass} rounded-xl bg-surface-1 text-center font-mono text-xl tabular-nums text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent`}
      />

      <StepperButton compact={compact} label={`Increase ${ariaLabel}`} onStep={() => stepBy(step)}>
        +
      </StepperButton>
    </div>
  )
}
