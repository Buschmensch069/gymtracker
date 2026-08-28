/**
 * Is the app running as an installed home-screen PWA rather than in a browser
 * tab? Both checks are needed: `navigator.standalone` is the iOS-only legacy
 * signal (and the only reliable one on older iOS), while `display-mode:
 * standalone` is the standard one every other engine implements.
 *
 * This matters for layout: in standalone there is no collapsible URL bar or
 * bottom toolbar, so the viewport height is fixed and the safe-area insets are
 * real (status bar / home indicator). In a browser tab the opposite holds —
 * the height moves as chrome collapses, and the insets are usually 0.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return iosStandalone === true || window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Stamp `data-standalone` on `<html>` so CSS can branch on display mode using
 * this same detection. `@media (display-mode: standalone)` alone is not enough
 * on iOS — see above — and `--app-height` needs the answer (`index.css` sizes
 * the app off the large viewport in standalone and the dynamic one in a
 * browser tab). Call once, before first render.
 */
export function markStandaloneDisplay(): void {
  if (typeof document === 'undefined') return
  if (isStandaloneDisplay()) {
    document.documentElement.dataset.standalone = 'true'
  }
}
