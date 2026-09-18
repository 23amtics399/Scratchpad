import { useEffect, useState } from 'react'
import { SettingsProvider } from '@/contexts/SettingsContext.js'
import { ToastProvider } from '@/contexts/ToastContext.js'
import { ToastContainer } from '@/components/Toast/ToastContainer.js'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext.js'
import { UIProvider } from '@/contexts/UIContext.js'
import { openDB } from '@/storage/db.js'
import { AppShell } from '@/components/AppShell/AppShell.js'

// ---------------------------------------------------------------------------
// DB initialization gate
// ---------------------------------------------------------------------------

type DBState = 'loading' | 'ready' | 'error'

function App() {
  const [dbState, setDbState] = useState<DBState>('loading')
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    openDB()
      .then(() => setDbState('ready'))
      .catch((err) => {
        setDbError(err instanceof Error ? err.message : 'Database failed to open')
        setDbState('error')
      })
  }, [])

  if (dbState === 'loading') {
    return (
      <div className="sp-splash">
        <div className="sp-splash__logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--sp-color-accent)"/>
            <path d="M9 8h14M9 13h10M9 18h12M9 23h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="sp-splash__message">Loading…</p>
      </div>
    )
  }

  if (dbState === 'error') {
    return (
      <div className="sp-splash sp-splash--error">
        <p>Failed to open database: {dbError}</p>
        <p>Try reloading the page. If this persists, check that your browser supports IndexedDB.</p>
      </div>
    )
  }

  return (
    <ToastProvider>
      <SettingsProvider>
        <WorkspaceProvider>
          <UIProvider>
            <AppShell />
            <ToastContainer />
          </UIProvider>
        </WorkspaceProvider>
      </SettingsProvider>
    </ToastProvider>
  )
}

export default App
