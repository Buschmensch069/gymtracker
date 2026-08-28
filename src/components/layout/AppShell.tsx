import { Outlet } from 'react-router-dom'
import { useAppViewportHeight } from '../../hooks/useAppViewportHeight'
import { ActiveWorkoutBanner } from '../../features/workout/ActiveWorkoutBanner'
// TEMPORARY — remove with src/components/debug/ViewportDebugOverlay.tsx once
// the standalone bottom-spacing numbers have been read off the device.
import { ViewportDebugOverlay } from '../debug/ViewportDebugOverlay'
import { BottomTabBar } from './BottomTabBar'

export function AppShell() {
  // CSS `dvh` (see index.css) owns the height in standalone, where it's exact.
  // This hook only returns a value when a JS correction is actually warranted
  // — in-browser chrome collapse, or an open keyboard. See the hook's docs.
  const viewportHeight = useAppViewportHeight()

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={viewportHeight ? { height: viewportHeight } : undefined}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
      <ActiveWorkoutBanner />
      <BottomTabBar />
      <ViewportDebugOverlay />
    </div>
  )
}
