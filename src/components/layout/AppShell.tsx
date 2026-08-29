import { Outlet } from 'react-router-dom'
import { useAppViewportHeight } from '../../hooks/useAppViewportHeight'
import { useKeyboardScrollIntoView } from '../../hooks/useKeyboardScrollIntoView'
import { ActiveWorkoutBanner } from '../../features/workout/ActiveWorkoutBanner'
import { RestTimerController } from '../../features/workout/RestTimerController'
import { BottomTabBar } from './BottomTabBar'

export function AppShell() {
  // CSS `var(--app-height)` (see index.css) owns the height in standalone,
  // where it's exact — `100lvh` there, `100dvh` in a browser tab.
  // This hook only returns a value when a JS correction is actually warranted
  // — in-browser chrome collapse, or an open keyboard. See the hook's docs.
  const viewportHeight = useAppViewportHeight()
  // Document-level: brings the focused field above the keyboard on focus,
  // once the viewport resize has settled. Mounted once for the same reason
  // RestTimerController is — it is one behaviour, not one per field.
  useKeyboardScrollIntoView()

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
      {/* Mounted once: owns the wake lock, the alarm and the flash. The
          countdown readouts elsewhere are pure display. */}
      <RestTimerController />
    </div>
  )
}
