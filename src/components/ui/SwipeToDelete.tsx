import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

/** How far the row slides when open — wide enough for the label plus a comfortable tap target. */
const REVEAL_PX = 88

/** Horizontal travel before we decide this is a swipe and not a tap or a scroll. */
const ENGAGE_PX = 10

/** Past this much of the reveal, letting go opens rather than snaps back. */
const OPEN_THRESHOLD = REVEAL_PX / 2

/** Rubber-band factor for dragging further than the reveal width. */
const OVERDRAG_RESISTANCE = 0.25

interface SwipeToDeleteProps {
  onDelete: () => void
  label?: string
  /** Applied to the sliding layer. Must include an opaque background, or the red panel shows through. */
  className?: string
  children: ReactNode
}

/**
 * Swipe a row left to reveal a Delete action.
 *
 * Replaces the per-row "Remove" button in the set list: a text button sits in
 * the layout costing width on every row forever, to serve an action taken on
 * maybe one row in twenty. The swipe costs nothing until it is used, and the
 * width goes to the weight and reps fields instead. The set-type sheet still
 * carries an explicit "Remove Set", so the action is discoverable without
 * knowing the gesture exists.
 *
 * Gesture rules that matter on a touch screen: nothing happens until the
 * finger has travelled `ENGAGE_PX` *horizontally and more horizontally than
 * vertically*, so a vertical scroll started on a row still scrolls the list
 * and a tap on an input inside the row still focuses it. Only once engaged do
 * we capture the pointer and swallow the resulting click.
 */
export function SwipeToDelete({ onDelete, label = 'Delete', className = '', children }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const start = useRef<{ x: number; y: number; offset: number } | null>(null)
  const engaged = useRef(false)
  const swallowClick = useRef(false)

  const settle = (next: number) => {
    setOffset(next)
    setDragging(false)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // A tap anywhere on an open row closes it instead of acting on whatever
    // was under the finger — reaching for "not that after all" must not
    // complete a set.
    if (offset !== 0) {
      swallowClick.current = true
      settle(0)
      return
    }
    // Clear any swallow left over from a gesture whose click never
    // materialised, so a stale flag can only ever cost the gesture that set
    // it — never eat the next real tap on the row.
    swallowClick.current = false
    start.current = { x: event.clientX, y: event.clientY, offset }
    engaged.current = false
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = start.current
    if (!origin) return

    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y

    if (!engaged.current) {
      if (Math.abs(dy) > ENGAGE_PX && Math.abs(dy) >= Math.abs(dx)) {
        // Vertical: this is the list scrolling. Bow out for the rest of the
        // gesture rather than fighting it.
        start.current = null
        return
      }
      if (Math.abs(dx) < ENGAGE_PX || Math.abs(dx) <= Math.abs(dy)) return
      engaged.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    const raw = origin.offset + dx
    if (raw > 0) {
      // Swiping right from closed: resist rather than pulling the row off the
      // other side, where there is nothing to reveal.
      setOffset(raw * OVERDRAG_RESISTANCE)
    } else if (raw < -REVEAL_PX) {
      setOffset(-REVEAL_PX + (raw + REVEAL_PX) * OVERDRAG_RESISTANCE)
    } else {
      setOffset(raw)
    }
  }

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current && !engaged.current) return
    const wasEngaged = engaged.current
    start.current = null
    engaged.current = false

    if (!wasEngaged) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    swallowClick.current = true
    settle(offset <= -OPEN_THRESHOLD ? -REVEAL_PX : 0)
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        tabIndex={offset === 0 ? -1 : 0}
        aria-hidden={offset === 0}
        className="absolute inset-y-0 right-0 flex w-22 flex-col items-center justify-center gap-0.5 bg-red-600 text-white"
      >
        <Trash2 size={18} />
        <span className="text-xs font-semibold">{label}</span>
      </button>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          if (!swallowClick.current) return
          swallowClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        className={`relative ${dragging ? '' : 'swipe-snap'} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
