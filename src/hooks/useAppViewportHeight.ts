import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from '../lib/standalone'
import { KEYBOARD_MIN_SHRINK_PX, appHeight } from '../lib/viewport'

/**
 * Root layout height, or `undefined` to let CSS `var(--app-height)` (see
 * index.css) own it. This is a *corrective* layer, deliberately not the
 * primary mechanism —
 * and it has to behave differently in the two display modes:
 *
 * - **In a browser tab**, the usable height genuinely moves as the URL bar and
 *   bottom toolbar collapse and expand, and iOS Safari's `dvh` under- and
 *   over-corrects through those transitions. Track `visualViewport.height`
 *   continuously, as before.
 *
 * - **Installed (standalone)**, there is no browser chrome at all, so the CSS
 *   height (`100lvh` there, not `100dvh` — see index.css) is already exact and
 *   there is nothing to correct. Overriding it with `visualViewport.height`
 *   there is actively harmful: any measurement taken
 *   mid-transition (launch animation, app switcher, rotation) is smaller than
 *   the screen and gets frozen into the layout as an inline pixel height,
 *   leaving a dead band at the bottom that looks exactly like space reserved
 *   for a toolbar that isn't there. So in standalone we only override while
 *   the keyboard is actually open.
 *
 * The returned height is also clamped so a stale or over-large reading can
 * never push the bottom tab bar off-screen — but NOT to `window.innerHeight`
 * in standalone. On iOS 26+ `innerHeight` is the *small* viewport (793 on an
 * 852pt iPhone) while the app is sized to the *large* one (852), so an
 * innerHeight clamp there would pin the layout straight back to 793 and
 * quietly undo the `--app-height` fix. `appHeight()` (src/lib/viewport.ts)
 * reads the app's real CSS height instead. In a browser tab `innerHeight`
 * genuinely is the layout viewport, so that path keeps using it unchanged.
 *
 * Shrinking the shell to `visualViewport.height` is also what makes the
 * focused-field scroll (`useKeyboardScrollIntoView`) correct: once the shell
 * ends at the top of the keyboard, "scroll it into the scroll container" and
 * "scroll it above the keyboard" are the same operation.
 */
export function useAppViewportHeight(): number | undefined {
  const [height, setHeight] = useState<number | undefined>(() => measure())

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const onChange = () => setHeight(measure())
    viewport.addEventListener('resize', onChange)
    // Standalone iOS can leave the visual viewport scrolled down after a
    // keyboard dismissal — the header slides above the top of the screen and
    // dead space appears at the bottom. Nothing else pulls it back, since
    // html/body never scroll.
    viewport.addEventListener('scroll', onChange)
    window.addEventListener('orientationchange', onChange)
    return () => {
      viewport.removeEventListener('resize', onChange)
      viewport.removeEventListener('scroll', onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])

  return height
}

function measure(): number | undefined {
  const viewport = window.visualViewport
  if (!viewport) return undefined

  resetViewportOffset(viewport)

  // In a browser tab `innerHeight` IS the layout viewport, and this path is
  // known-good — leave it alone.
  if (!isStandaloneDisplay()) {
    return Math.min(viewport.height, window.innerHeight)
  }

  // Standalone: measure against the app's own height, not `innerHeight`. An
  // innerHeight clamp would pin the layout to the small viewport, and it would
  // also bias the keyboard test by the status-bar inset — the standing gap
  // reads as ~59px of "shrink" before a keyboard has opened at all.
  const appViewport = appHeight()
  const keyboardOpen = appViewport - viewport.height >= KEYBOARD_MIN_SHRINK_PX
  return keyboardOpen ? Math.min(viewport.height, appViewport) : undefined
}

/**
 * Pin the visual viewport back to the top of the layout viewport. iOS scrolls
 * it down to reveal a focused field and doesn't always scroll back, which
 * shifts the whole app down behind the status bar. Skipped while an input is
 * focused so we don't fight iOS mid-focus.
 */
function resetViewportOffset(viewport: VisualViewport): void {
  if (viewport.offsetTop <= 0 && window.scrollY <= 0) return
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
  window.scrollTo(0, 0)
}
