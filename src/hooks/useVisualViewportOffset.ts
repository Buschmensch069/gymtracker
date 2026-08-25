import { useEffect, useState } from 'react'

/**
 * Tracks window.visualViewport height as a JS-corrective layer on top of the
 * CSS `dvh` root height. Covers iOS Safari edge cases where `dvh` under- or
 * over-corrects as the on-screen keyboard opens/closes.
 */
export function useVisualViewportHeight(): number | undefined {
  const [height, setHeight] = useState<number | undefined>(
    () => window.visualViewport?.height,
  )

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const onResize = () => setHeight(viewport.height)
    viewport.addEventListener('resize', onResize)
    return () => viewport.removeEventListener('resize', onResize)
  }, [])

  return height
}
