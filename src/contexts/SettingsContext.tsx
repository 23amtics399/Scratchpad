import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { SettingsRecord } from '@/types/index.js'
import { DEFAULT_SETTINGS } from '@/types/index.js'
import { settingsRepository } from '@/storage/repositories/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsContextValue {
  settings: SettingsRecord
  isLoaded: boolean
  updateSettings: (changes: Partial<Omit<SettingsRecord, 'id'>>) => Promise<void>
  resetSettings: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SettingsContext = createContext<SettingsContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SettingsRecord>({ ...DEFAULT_SETTINGS })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    settingsRepository.get().then((loaded) => {
      setSettings(loaded)
      setIsLoaded(true)
      applyThemeToDOM(loaded)
    })
  }, [])

  const updateSettings = useCallback(async (changes: Partial<Omit<SettingsRecord, 'id'>>) => {
    const next = { ...settings, ...changes }
    setSettings(next)
    await settingsRepository.save(next)
    applyThemeToDOM(next)
  }, [settings])

  const resetSettings = useCallback(async () => {
    const defaults = { ...DEFAULT_SETTINGS }
    setSettings(defaults)
    await settingsRepository.reset()
    applyThemeToDOM(defaults)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, isLoaded, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// DOM theme application
// ---------------------------------------------------------------------------

function applyThemeToDOM(settings: SettingsRecord): void {
  const root = document.documentElement

  // Theme
  root.setAttribute('data-theme', settings.theme)

  // Density
  root.setAttribute('data-density', settings.uiDensity)

  // UI scale
  root.style.fontSize = `${settings.uiScale}%`

  // Reduced animations
  if (!settings.showAnimations) {
    root.style.setProperty('--sp-anim-fast', '0ms')
    root.style.setProperty('--sp-anim-normal', '0ms')
    root.style.setProperty('--sp-anim-slow', '0ms')
  } else {
    root.style.removeProperty('--sp-anim-fast')
    root.style.removeProperty('--sp-anim-normal')
    root.style.removeProperty('--sp-anim-slow')
  }

  // Sidebar width
  root.style.setProperty('--sp-layout-sidebar-width', `${settings.sidebarWidth}px`)

  // Accent color
  root.style.setProperty('--sp-color-accent', settings.accentColor)

  // Editor defaults (document-level formatting overrides these)
  root.style.setProperty('--sp-editor-default-font', settings.fontFamily)
  root.style.setProperty('--sp-editor-default-size', `${settings.fontSize}px`)
  root.style.setProperty('--sp-editor-default-line-height', String(settings.lineHeight))
}
