import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDatabaseIfNeeded } from './db/seed.ts'
import { requestPersistentStorageIfNeeded } from './lib/storage.ts'

seedDatabaseIfNeeded().finally(() => {
  requestPersistentStorageIfNeeded()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
