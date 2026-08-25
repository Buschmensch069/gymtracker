import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ExerciseLibraryPage } from './features/exercises/ExerciseLibraryPage'
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage'
import { ExerciseFormPage } from './features/exercises/ExerciseFormPage'
import { ActiveWorkoutPage } from './features/workout/ActiveWorkoutPage'
import { HistoryListPage } from './features/history/HistoryListPage'
import { WorkoutDetailPage } from './features/history/WorkoutDetailPage'
import { SettingsPage } from './features/settings/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/workout" replace />} />
          <Route path="/exercises" element={<ExerciseLibraryPage />} />
          <Route path="/exercises/new" element={<ExerciseFormPage />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
          <Route path="/workout" element={<ActiveWorkoutPage />} />
          <Route path="/history" element={<HistoryListPage />} />
          <Route path="/history/:workoutId" element={<WorkoutDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
