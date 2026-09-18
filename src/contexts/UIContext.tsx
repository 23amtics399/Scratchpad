import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types — UI-only state (sidebar visibility, panels, command palette)
// ---------------------------------------------------------------------------

export interface StorageBannerState {
  message: string
  isQuota: boolean
  diagnostics?: string
}

interface UIState {
  sidebarOpen: boolean
  outlineOpen: boolean
  commandPaletteOpen: boolean
  searchOpen: boolean
  settingsOpen: boolean
  focusMode: boolean
  activePanel: 'explorer' | 'search' | 'favorites' | 'recent' | null
  contextMenu: ContextMenuState | null
  storageBanner: StorageBannerState | null
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  action?: () => void
}

interface UIActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleOutline: () => void
  toggleFocusMode: () => void
  setFocusMode: (focus: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  openSearch: () => void
  closeSearch: () => void
  openSettings: () => void
  closeSettings: () => void
  setActivePanel: (panel: UIState['activePanel']) => void
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void
  closeContextMenu: () => void
  showStorageBanner: (banner: StorageBannerState) => void
  dismissStorageBanner: () => void
}

type UIContextValue = UIState & UIActions

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UIContext = createContext<UIContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface UIProviderProps {
  children: ReactNode
}

export function UIProvider({ children }: UIProviderProps) {
  const [state, setState] = useState<UIState>({
    sidebarOpen: true,
    outlineOpen: false,
    commandPaletteOpen: false,
    searchOpen: false,
    settingsOpen: false,
    focusMode: false,
    activePanel: 'explorer',
    contextMenu: null,
    storageBanner: null,
  })

  const toggleSidebar = useCallback(() => {
    setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))
  }, [])

  const setSidebarOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, sidebarOpen: open }))
  }, [])

  const toggleOutline = useCallback(() => {
    setState((s) => ({ ...s, outlineOpen: !s.outlineOpen }))
  }, [])

  const toggleFocusMode = useCallback(() => {
    setState((s) => ({ ...s, focusMode: !s.focusMode }))
  }, [])

  const setFocusMode = useCallback((focus: boolean) => {
    setState((s) => ({ ...s, focusMode: focus }))
  }, [])

  const openCommandPalette = useCallback(() => {
    setState((s) => ({ ...s, commandPaletteOpen: true }))
  }, [])

  const closeCommandPalette = useCallback(() => {
    setState((s) => ({ ...s, commandPaletteOpen: false }))
  }, [])

  const openSearch = useCallback(() => {
    setState((s) => ({ ...s, searchOpen: true }))
  }, [])

  const closeSearch = useCallback(() => {
    setState((s) => ({ ...s, searchOpen: false }))
  }, [])

  const openSettings = useCallback(() => {
    setState((s) => ({ ...s, settingsOpen: true }))
  }, [])

  const closeSettings = useCallback(() => {
    setState((s) => ({ ...s, settingsOpen: false }))
  }, [])

  const setActivePanel = useCallback((panel: UIState['activePanel']) => {
    setState((s) => ({ ...s, activePanel: panel }))
  }, [])

  const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setState((s) => ({ ...s, contextMenu: { x, y, items } }))
  }, [])

  const closeContextMenu = useCallback(() => {
    setState((s) => ({ ...s, contextMenu: null }))
  }, [])

  const showStorageBanner = useCallback((banner: StorageBannerState) => {
    setState((s) => ({ ...s, storageBanner: banner }))
  }, [])

  const dismissStorageBanner = useCallback(() => {
    setState((s) => ({ ...s, storageBanner: null }))
  }, [])

  const value: UIContextValue = {
    ...state,
    toggleSidebar,
    setSidebarOpen,
    toggleOutline,
    toggleFocusMode,
    setFocusMode,
    openCommandPalette,
    closeCommandPalette,
    openSearch,
    closeSearch,
    openSettings,
    closeSettings,
    setActivePanel,
    showContextMenu,
    closeContextMenu,
    showStorageBanner,
    dismissStorageBanner,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used inside UIProvider')
  return ctx
}
