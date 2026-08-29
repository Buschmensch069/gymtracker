import { useEffect } from 'react'
import { isKeyboardOpen, pinDocumentScroll, visibleBottom } from '../lib/viewport'

/**
 * How long after the last `visualViewport` resize we treat the keyboard
 * animation as finished. iOS fires a burst of resizes as the keyboard slides
 * up; scrolling on the first one puts the field in the wrong place, which is
 * the bug this hook exists to fix.
 */
const SETTLE_MS = 90

/**
 * Give up waiting for a resize that is never going to come. Focusing a second
 * field while the keyboard is already up produces no resize at all, so without
 * this the scroll would never happen for exactly the case that matters most
 * mid-workout: moving from weight to reps.
 */
const MAX_WAIT_MS = 500

/**
 * How long after a focus we keep re-pinning the document every frame.
 *
 * iOS's own reveal-scroll is not a single event we can cancel — it lands some
 * frames after `focusin`, again as the keyboard animates, and sometimes again
 * once the keyboard has settled. Pinning once on focus is therefore not
 * enough; the events we listen to cover most of it, but the frame loop is what
 * catches the reveals that arrive without firing anything we can hear. Long
 * enough to outlast the keyboard animation, short enough that we are not
 * running a frame loop while the user types.
 */
const PIN_WATCH_MS = 700

/** Breathing room kept between the focused field and the edge it is nearest. */
const MARGIN_PX = 16

/**
 * Keeps the focused input visible above the on-screen keyboard, and keeps the
 * *shell* still while doing it.
 *
 * Two separate things go wrong on iOS when a field is focused, and they need
 * separate fixes:
 *
 * 1. **iOS scrolls the document to reveal the field.** `overflow: hidden` on
 *    html/body stops the user scrolling the viewport, not the UA, and in
 *    standalone there is real overflow to scroll (large viewport 852 vs an
 *    ICB of 793 — see CLAUDE.md's band note). iOS also pans the visual
 *    viewport inside the layout viewport, which needs no overflow at all. The
 *    result is the whole app sliding up — header and bottom tab bar included —
 *    which is unmistakable in a screenshot and is *not* the inner list
 *    scrolling too far. Correcting for it afterwards is hopeless because it
 *    keeps happening; `pinDocumentScroll()` (src/lib/viewport.ts) is applied
 *    on focus, on every viewport resize/scroll, and every frame for
 *    `PIN_WATCH_MS` after a focus, so the document never stays displaced.
 *    Only the `.scroll-touch` container is ever allowed to move.
 *
 * 2. **Safari does not scroll the container that actually needs scrolling.**
 *    Its own reveal logic does not run correctly for a field inside a nested
 *    scroll container whose height changes underneath it — the app shell
 *    shrinks to `visualViewport.height` when the keyboard opens (see
 *    `useAppViewportHeight`), and Safari resolves its scroll against the
 *    pre-resize layout. The visible symptom was that the field only came into
 *    view after the *first keystroke*, because the resulting DOM change is
 *    what finally triggered Safari's own correction. So this scrolls the
 *    container on `focusin` — no typing required — after waiting for the
 *    resize burst to settle, so it measures against the post-keyboard layout.
 *
 * Both halves are needed. Fixing only (2) is what made fields near the top of
 * a list work while fields further down still dragged the whole shell up: the
 * further down the list the field is, the more document scroll iOS applies.
 *
 * Mounted once, in `AppShell`: it is a document-level behaviour, and wiring it
 * per input would leave every textarea and search field (notes, exercise
 * picker, rep ranges) with the original bug.
 */
export function useKeyboardScrollIntoView(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let settleTimer: ReturnType<typeof setTimeout> | undefined
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined
    let pinFrame: number | undefined
    let pinUntil = 0
    let target: HTMLElement | null = null

    const stopWaiting = () => {
      clearTimeout(settleTimer)
      clearTimeout(deadlineTimer)
      viewport.removeEventListener('resize', onViewportResize)
    }

    /**
     * Re-pin every frame until the deadline. Cheap: `pinDocumentScroll` reads
     * a handful of scroll offsets and only writes when one of them is
     * non-zero, so a quiet frame costs nothing.
     */
    const pinLoop = () => {
      pinDocumentScroll()
      if (performance.now() >= pinUntil) {
        pinFrame = undefined
        return
      }
      pinFrame = requestAnimationFrame(pinLoop)
    }

    const startPinning = () => {
      pinUntil = performance.now() + PIN_WATCH_MS
      pinDocumentScroll()
      if (pinFrame === undefined) pinFrame = requestAnimationFrame(pinLoop)
    }

    const stopPinning = () => {
      if (pinFrame !== undefined) cancelAnimationFrame(pinFrame)
      pinFrame = undefined
      pinUntil = 0
    }

    const run = () => {
      stopWaiting()
      const element = target
      target = null
      // The field may have blurred or unmounted while we waited out the
      // keyboard animation; scrolling to it then would be a random jump.
      if (!element || !element.isConnected || document.activeElement !== element) return
      // One more frame so React has committed the shrunken shell height
      // before we measure against it.
      requestAnimationFrame(() => {
        // Measure from a pinned document: `getBoundingClientRect()` is
        // relative to the layout viewport, so a displaced one would offset
        // every number below by however far iOS had dragged us.
        pinDocumentScroll()
        scrollIntoView(element)
        // And once more after, since our own container scroll can prompt iOS
        // to have another go at revealing the field itself.
        startPinning()
      })
    }

    function onViewportResize() {
      // A resize means the keyboard is moving, which is exactly when iOS
      // re-reveals the focused field. Pin first, decide about scrolling after.
      startPinning()
      clearTimeout(settleTimer)
      settleTimer = setTimeout(run, SETTLE_MS)
    }

    // The document has no business being scrolled at any point, keyboard or
    // not — these are the events that fire when iOS has moved it.
    const onDocumentScroll = () => {
      pinDocumentScroll()
    }

    const onFocusIn = (event: FocusEvent) => {
      const element = event.target
      if (!isTextEntry(element)) return

      stopWaiting()
      target = element
      // Before anything else: iOS's reveal-scroll starts as soon as focus
      // lands, so the watch has to start here rather than after the settle.
      startPinning()

      // Keyboard already up (moving between fields) — no resize is coming, so
      // waiting for one would just add MAX_WAIT_MS of visible lag.
      if (isKeyboardOpen()) {
        run()
        return
      }

      viewport.addEventListener('resize', onViewportResize)
      deadlineTimer = setTimeout(run, MAX_WAIT_MS)
    }

    const onFocusOut = () => {
      // Dismissing the keyboard is another moment iOS commonly leaves the
      // viewport displaced, so keep pinning across it rather than stopping.
      startPinning()
      if (document.activeElement === target) return
      target = null
      stopWaiting()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', onDocumentScroll, { passive: true })
    viewport.addEventListener('scroll', onDocumentScroll)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', onDocumentScroll)
      viewport.removeEventListener('scroll', onDocumentScroll)
      stopWaiting()
      stopPinning()
    }
  }, [])
}

function isTextEntry(node: EventTarget | null): node is HTMLElement {
  return (
    (node instanceof HTMLInputElement && node.type !== 'checkbox' && node.type !== 'radio') ||
    node instanceof HTMLTextAreaElement
  )
}

/**
 * Scrolls the element's own scroll container (the one `.scroll-touch` region a
 * page has — see CLAUDE.md, nothing else in the app scrolls) by the minimum
 * amount that brings the field fully inside the visible area.
 *
 * The container's bottom is normally already above the keyboard, because the
 * shell shrinks with the visual viewport. `visibleBottom()` is taken as a
 * second bound anyway, for the frame where the shell has not caught up and for
 * a sheet that runs the full height of the screen.
 */
function scrollIntoView(element: HTMLElement): void {
  const container = element.closest('.scroll-touch')
  const rect = element.getBoundingClientRect()

  if (!(container instanceof HTMLElement)) {
    // Nothing scrollable around it (e.g. a field in a short sheet). If it is
    // under the keyboard there is nothing we can scroll to fix it.
    return
  }

  const containerRect = container.getBoundingClientRect()
  const top = containerRect.top + MARGIN_PX
  const bottom = Math.min(containerRect.bottom, visibleBottom()) - MARGIN_PX

  // A field taller than the visible slot: align its top rather than chasing
  // its bottom off the other edge.
  if (rect.height > bottom - top) {
    container.scrollTop += rect.top - top
    return
  }

  if (rect.bottom > bottom) {
    container.scrollTop += rect.bottom - bottom
  } else if (rect.top < top) {
    container.scrollTop -= top - rect.top
  }
}
