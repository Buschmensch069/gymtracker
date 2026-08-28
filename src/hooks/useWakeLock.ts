import { useEffect, useSyncExternalStore } from 'react'

/**
 * Screen wake lock, so the screen doesn't dim mid-rest.
 *
 * This is what makes the rest timer work at all: iOS suspends a home-screen
 * web app's JS the moment the screen locks or the app backgrounds, so a timer
 * only survives while the screen stays awake and the app stays foreground.
 *
 * Availability: Safari has had the API since iOS 16.4, but it was broken
 * specifically in Home Screen Web Apps until **iOS 18.4** (WebKit bug 254545).
 * `supported` reports only whether the API exists; `held` reports whether a
 * lock is actually in hand right now, which is the honest signal to surface in
 * the UI — on a pre-18.4 home-screen app the request rejects even though the
 * API is present.
 *
 * Split into a holder and a status reader because more than one component
 * wants to know the state (the rest bar warns when the lock isn't held) but
 * exactly one should be requesting a sentinel. Module-level state rather than
 * context: there is only ever one screen to keep awake.
 */

export const WAKE_LOCK_SUPPORTED = typeof navigator !== 'undefined' && 'wakeLock' in navigator

let held = false
const listeners = new Set<() => void>()

function setHeld(next: boolean): void {
  if (held === next) return
  held = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Read-only. Safe to call from any number of components. */
export function useWakeLockHeld(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => held,
    () => false,
  )
}

/**
 * Acquires and holds the lock while `active`. Call from exactly ONE component
 * (RestTimerController) — a second caller would request a redundant sentinel.
 *
 * The browser auto-releases the lock whenever the page is hidden, so it has to
 * be re-acquired on visibilitychange rather than requested once.
 */
export function useWakeLockHolder(active: boolean): void {
  useEffect(() => {
    if (!WAKE_LOCK_SUPPORTED || !active) {
      setHeld(false)
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const release = () => {
      // Not awaited: the effect is tearing down and nothing observes the result.
      void sentinel?.release().catch(() => {})
      sentinel = null
      setHeld(false)
    }

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void next.release().catch(() => {})
          return
        }
        sentinel = next
        setHeld(true)
        // Fires both when the browser drops it (page hidden) and on our own
        // release, so keep it in sync rather than assuming we still hold it.
        next.addEventListener('release', () => setHeld(false))
      } catch {
        // Rejects on pre-18.4 home-screen web apps, in low-power mode, and when
        // the page isn't visible. Not an error worth surfacing as a failure —
        // held:false already tells the UI to warn.
        setHeld(false)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [active])
}
