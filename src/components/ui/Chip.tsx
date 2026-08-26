interface ChipProps {
  label: string
  active?: boolean
  color?: string
  onClick?: () => void
}

/**
 * Shared pill chip. `color` is a hex value (from muscleColors.ts) rendered
 * as a small identity dot — color never carries meaning alone, the label
 * text is always present alongside it.
 */
export function Chip({ label, active = false, color, onClick }: ChipProps) {
  const className = `inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
    active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-slate-300'
  }`
  const dot = color && !active && (
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {dot}
        {label}
      </button>
    )
  }

  return (
    <span className={className}>
      {dot}
      {label}
    </span>
  )
}
