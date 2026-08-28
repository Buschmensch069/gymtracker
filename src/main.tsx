import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDatabaseIfNeeded } from './db/seed.ts'
import { requestPersistentStorageIfNeeded } from './lib/storage.ts'
import { markStandaloneDisplay } from './lib/standalone.ts'

// Before first paint: --app-height keys off this attribute.
markStandaloneDisplay()

seedDatabaseIfNeeded().finally(() => {
  requestPersistentStorageIfNeeded()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
