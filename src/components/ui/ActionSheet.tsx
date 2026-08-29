import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const EXIT_DURATION_MS = 220

/**
 * Lets an item dismiss the sheet it lives in without every caller threading a
 * close callback through its own handler — and, more importantly, lets the
 * exit animation finish before the action runs, so a sheet that opens another
 * sheet doesn't cross-fade with itself.
 */
const CloseContext = createContext<(after?: () => void) => void>(() => {})

interface ActionSheetProps {
  title?: string
  onClose: () => void
  children: ReactNode
}

/**
 * iOS-style bottom action sheet: a scrim plus a short card of choices anchored
 * to the bottom edge.
 *
 * Distinct from `Sheet`, which is a full-screen takeover for content you
 * browse (the exercise picker). A three-line menu doesn't warrant losing the
 * whole screen, and anchoring it to the bottom keeps the choices under the
 * thumb — this is used mid-set, one-handed.
 *
 * `pb-safe` is correct here (not `pb-home-indicator`): this is a full-height
 * overlay whose content really does run to the bottom edge of the screen, the
 * case CLAUDE.md's safe-area note calls out.
 */
export function ActionSheet({ title, onClose, children }: ActionSheetProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = (after?: () => void) => {
    setVisible(false)
    setTimeout(() => {
      onClose()
      after?.()
    }, EXIT_DURATION_MS)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => close()}
        className={`absolute inset-0 bg-black/60 action-sheet-scrim ${visible ? 'action-sheet-scrim-open' : ''}`}
      />

      {/* pb-safe on the wrapper, the visual padding on the child inside it:
          the safe-area utilities set padding outright and are emitted after
          Tailwind's own, so `pb-2 pb-safe` on one element would silently drop
          the pb-2 — and in a browser tab, where the inset is 0, leave the
          Cancel button flush against the bottom edge. */}
      <div
        className={`relative w-full pb-safe action-sheet-panel ${visible ? 'action-sheet-panel-open' : ''}`}
      >
        <div className="px-2 pb-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
            {title && (
              <p className="border-b border-border px-4 py-3 text-center text-sm font-medium text-slate-400">
                {title}
              </p>
            )}
            <CloseContext.Provider value={close}>{children}</CloseContext.Provider>
          </div>
          <button
            type="button"
            onClick={() => close()}
            className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-surface-1 font-semibold text-slate-300 active:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

interface ActionSheetItemProps {
  onSelect: () => void
  /** Badge or icon shown in the fixed-width gutter, so the labels stay aligned down the list. */
  leading?: ReactNode
  destructive?: boolean
  selected?: boolean
  children: ReactNode
}

export function ActionSheetItem({
  onSelect,
  leading,
  destructive,
  selected,
  children,
}: ActionSheetItemProps) {
  const close = useContext(CloseContext)

  return (
    <button
      type="button"
      onClick={() => close(onSelect)}
      aria-current={selected || undefined}
      className={`flex min-h-13 w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 active:bg-surface-2 ${
        destructive ? 'text-red-400' : 'text-slate-100'
      } ${selected ? 'bg-surface-2' : ''}`}
    >
      {leading !== undefined && (
        <span className="flex w-8 shrink-0 items-center justify-center">{leading}</span>
      )}
      <span className="flex-1 font-medium">{children}</span>
    </button>
  )
}
