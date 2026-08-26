import { useEffect, useRef } from 'react'

interface StepperButtonProps {
  onStep: () => void
  label: string
  children: React.ReactNode
}

const REPEAT_START_MS = 400
const REPEAT_INTERVAL_MS = 100

/** A +/- button that fires once on tap and auto-repeats (accelerating feel) on long-press. */
export function StepperButton({ onStep, label, children }: StepperButtonProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const clearTimers = () => {
    clearTimeout(timeoutRef.current)
    clearInterval(intervalRef.current)
  }

  useEffect(() => clearTimers, [])

  const start = () => {
    onStep()
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(onStep, REPEAT_INTERVAL_MS)
    }, REPEAT_START_MS)
  }

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={start}
      onPointerUp={clearTimers}
      onPointerLeave={clearTimers}
      onPointerCancel={clearTimers}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-2xl font-semibold text-slate-100 active:bg-surface-2/70"
    >
      {children}
    </button>
  )
}
