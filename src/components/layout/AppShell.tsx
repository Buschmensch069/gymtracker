import { Outlet } from 'react-router-dom'
import { useVisualViewportHeight } from '../../hooks/useVisualViewportOffset'
import { BottomTabBar } from './BottomTabBar'

export function AppShell() {
  // CSS `dvh` (see index.css) handles the common case; this is a JS-corrective
  // layer for iOS Safari edge cases where `dvh` under/over-corrects as the
  // on-screen keyboard opens.
  const visualViewportHeight = useVisualViewportHeight()

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={visualViewportHeight ? { height: visualViewportHeight } : undefined}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  )
}
