import { formatRest } from '../../lib/restTimer'

/**
 * The countdown readout itself, shared by the active-workout bar and the
 * cross-tab banner so the two can't drift. Deliberately large and tabular —
 * it has to be readable from across the gym with the phone propped up.
 *
 * Past zero it counts *up* instead of sitting at 0:00, so a glance after the
 * app was suspended tells you how long you've actually been resting rather
 * than how long ago the number froze.
 */
export function RestCountdown({
  remainingMs,
  size = 'large',
}: {
  remainingMs: number
  size?: 'large' | 'small'
}) {
  const overtime = remainingMs <= 0
  const seconds = Math.abs(remainingMs) / 1000
  const text = `${overtime ? '+' : ''}${formatRest(overtime ? Math.floor(seconds) : Math.ceil(seconds))}`

  return (
    <span
      className={`font-mono font-bold tabular-nums ${size === 'large' ? 'text-4xl' : 'text-xl'} ${
        overtime ? 'text-amber-400' : 'text-accent'
      }`}
    >
      {text}
    </span>
  )
}
