import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { SetComparison } from '../../lib/analytics'

interface ComparisonBadgeProps {
  direction: SetComparison
  /** Optional short text beside the arrow, e.g. "+8%" on the volume badge. */
  text?: string
  /** Spelled-out comparison for VoiceOver — the arrow alone says nothing useful. */
  label: string
}

/**
 * The "versus last time" indicator: an arrow, optionally a number, nothing
 * else.
 *
 * Only `up` is coloured. A green arrow is the one state worth catching from
 * across the gym, and making `down` red would turn an ordinary lighter day —
 * a deload, a bad night's sleep, the third exercise of a long session — into
 * an alarm on a screen you look at twenty times a workout. Down and matched
 * are the same muted slate as the rest of the row's secondary line. There is
 * no animation for the same reason: this is a readout, not a reward.
 *
 * `mixed` (weight traded for reps) renders as the matched dash rather than
 * guessing — see `compareSets`. Its aria-label still gives the real numbers,
 * so nothing is hidden from a screen reader that the glyph elides.
 */
export function ComparisonBadge({ direction, text, label }: ComparisonBadgeProps) {
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  const tone = direction === 'up' ? 'text-emerald-400' : 'text-slate-500'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold tabular-nums ${tone}`}
      aria-label={label}
      title={label}
    >
      <Icon size={12} strokeWidth={3} aria-hidden="true" />
      {text}
    </span>
  )
}
