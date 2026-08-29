import { isStandaloneDisplay } from './standalone'

/**
 * The on-screen keyboard is the only thing that shrinks the visual viewport by
 * a meaningful amount; anything smaller than this is Safari's own chrome
 * animating, a rubber-band, or a rounding difference, and must not be baked
 * into the layout height or read as "the keyboard is open".
 */
export const KEYBOARD_MIN_SHRINK_PX = 120

/**
 * The app's full height as CSS currently computes it — `var(--app-height)`,
 * which is `100lvh` in standalone and `100dvh` in a browser tab. Probed rather
 * than re-derived so it cannot drift out of sync with index.css, and read off
 * a `position: fixed` zero-width hidden node so no ancestor's `overflow`
 * clips it and nothing in our layout is disturbed by the measurement.
 *
 * Deliberately NOT `window.innerHeight`: on iOS 26+ in standalone that is the
 * *small* viewport (793 on an 852pt iPhone) while the app is sized to the
 * *large* one (852) — see CLAUDE.md's band note.
 */
export function appHeight(): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:var(--app-height);visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const height = probe.getBoundingClientRect().height
  probe.remove()
  return height || window.innerHeight
}

/**
 * The height the app is laid out into right now, ignoring the keyboard. In a
 * browser tab `innerHeight` genuinely is the layout viewport; in standalone it
 * is the small viewport and would bias every comparison by the status-bar
 * inset, so probe the real CSS height there instead.
 */
export function layoutHeight(): number {
  return isStandaloneDisplay() ? appHeight() : window.innerHeight
}

/** Is the on-screen keyboard currently taking up space? */
export function isKeyboardOpen(): boolean {
  const viewport = window.visualViewport
  if (!viewport) return false
  return layoutHeight() - viewport.height >= KEYBOARD_MIN_SHRINK_PX
}

/**
 * The bottom edge of the *visible* area, in layout-viewport (i.e.
 * `getBoundingClientRect`) coordinates. With the keyboard open this is the top
 * of the keyboard; `offsetTop` accounts for iOS having scrolled the visual
 * viewport down inside the layout viewport.
 */
export function visibleBottom(): number {
  const viewport = window.visualViewport
  if (!viewport) return window.innerHeight
  return viewport.offsetTop + viewport.height
}
