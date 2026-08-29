import { useEffect } from 'react'
import { isKeyboardOpen, visibleBottom } from '../lib/viewport'

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

/** Breathing room kept between the focused field and the edge it is nearest. */
const MARGIN_PX = 16

/**
 * Keeps the focused input visible above the on-screen keyboard.
 *
 * iOS's own "scroll the focused field into view" does not run for a field
 * inside a nested scroll container whose height changes underneath it — the
 * app shell shrinks to `visualViewport.height` when the keyboard opens (see
 * `useAppViewportHeight`), and Safari resolves its scroll against the
 * pre-resize layout. The visible symptom was that the field only came into
 * view after the *first keystroke*, because the resulting DOM change is what
 * finally triggered Safari's own correction. So this scrolls on `focusin`
 * instead — no typing required — and waits for the resize burst to settle
 * first so it is scrolling against the post-keyboard layout rather than the
 * pre-keyboard one.
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
    let target: HTMLElement | null = null

    const stopWaiting = () => {
      clearTimeout(settleTimer)
      clearTimeout(deadlineTimer)
      viewport.removeEventListener('resize', onViewportResize)
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
      requestAnimationFrame(() => scrollIntoView(element))
    }

    function onViewportResize() {
      clearTimeout(settleTimer)
      settleTimer = setTimeout(run, SETTLE_MS)
    }

    const onFocusIn = (event: FocusEvent) => {
      const element = event.target
      if (!isTextEntry(element)) return

      stopWaiting()
      target = element

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
      if (document.activeElement === target) return
      target = null
      stopWaiting()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      stopWaiting()
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
