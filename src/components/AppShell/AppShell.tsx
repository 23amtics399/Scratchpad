import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import { useSettings } from '@/contexts/SettingsContext.js'
import { useToast } from '@/contexts/ToastContext.js'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts.js'
import { importService } from '@/services/ImportService.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { documentRepository } from '@/storage/repositories/index.js'
import {
  MenuBar,
  TabBar,
  Explorer,
  StatusBar,
  ContextMenu,
  CommandPalette,
  EditorPane,
  WorkspaceSearchModal,
  SettingsDialog,
  AboutModal,
  ShareModal,
} from '@/components/index.js'
import { StorageBanner } from './StorageBanner.js'
import { OutlinePanel } from '@/components/Outline/OutlinePanel.js'
import './AppShell.css'

/**
 * AppShell — the outermost application layout.
 * Composes: MenuBar, Sidebar (Explorer), TabBar, EditorArea, StatusBar, ContextMenu, CommandPalette
 *
 * Layout structure (IDE grid):
 *   ┌──────────────────────────────────────┐
 *   │ MenuBar                              │
 *   ├──────────┬───────────────────────────┤
 *   │          │ TabBar                    │
 *   │ Sidebar  ├───────────────────────────┤
 *   │          │ Editor Area               │
 *   │          │                           │
 *   ├──────────┴───────────────────────────┤
 *   │ StatusBar                            │
 *   └──────────────────────────────────────┘
 */
export function AppShell() {
  const {
    isLoading,
    error,
    activeTabId,
    workspace,
    createDocument,
    openDocument,
    reload,
  } = useWorkspace()
  const {
    sidebarOpen,
    setSidebarOpen,
    outlineOpen,
    focusMode,
    searchOpen,
    closeSearch,
    settingsOpen,
    closeSettings,
    aboutOpen,
    closeAbout,
    shareOpen,
    closeShare,
  } = useUI()
  const { settings, updateSettings } = useSettings()
  const { showToast } = useToast()

  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const dragCounterRef = useRef(0)

  // Track responsive viewport width for tablet/mobile overlay mode
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setViewportWidth(w)
      window.dispatchEvent(new CustomEvent('scratchpad:viewport-resize', { detail: { width: w } }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isOverlayLayout = viewportWidth <= 1024

  // Listen for window-level external file drag-and-drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounterRef.current++
        setIsDraggingFiles(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounterRef.current--
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0
          setIsDraggingFiles(false)
        }
      }
    }

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDrop = async (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDraggingFiles(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      for (const file of files) {
        try {
          const res = await importService.parseImportFile(file)
          if (res.kind === 'workspace-backup') {
            if (workspace) {
              await workspaceService.restoreBackup(res.data, workspace.id, 'merge')
              await reload()
              showToast({ message: 'Workspace backup restored successfully.', type: 'success' })
            }
          } else {
            const created = await createDocument(res.title, res.type, null)
            if (created && res.content) {
              await documentRepository.save(created.id, res.content, 0, 0, res.type)
              await reload()
              openDocument(created.id)
            }
            showToast({ message: `Imported "${res.title}"`, type: 'success' })
          }
        } catch (err) {
          console.error('External file import failed:', err)
          showToast({ message: `Failed to import "${file.name}"`, type: 'error' })
        }
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [workspace, createDocument, openDocument, reload, showToast])
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(settings.sidebarWidth || 270)

  // Draggable resizer handler (constrained to desktop bounds 220px - 480px)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isResizingRef.current = true
      startXRef.current = e.clientX
      startWidthRef.current = settings.sidebarWidth || 270
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      let currentWidth = startWidthRef.current

      const handlePointerMove = (ev: PointerEvent) => {
        if (!isResizingRef.current) return
        const delta = ev.clientX - startXRef.current
        currentWidth = Math.max(220, Math.min(480, startWidthRef.current + delta))
        document.documentElement.style.setProperty('--sp-layout-sidebar-width', `${currentWidth}px`)
      }

      const handlePointerUp = () => {
        if (!isResizingRef.current) return
        isResizingRef.current = false
        document.body.style.removeProperty('cursor')
        document.body.style.removeProperty('user-select')
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        updateSettings({ sidebarWidth: currentWidth })
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [settings.sidebarWidth, updateSettings]
  )

  // Initialize global keyboard shortcuts (Ctrl+Shift+P, Ctrl+N, Ctrl+W, Ctrl+S, Ctrl+Shift+F)
  useGlobalShortcuts()

  if (isLoading) {
    return <div className="app-shell__loading" aria-label="Loading workspace">Loading workspace…</div>
  }

  if (error) {
    return (
      <div className="app-shell__error" role="alert">
        <h2>Failed to load workspace</h2>
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="app-shell"
        data-sidebar-open={sidebarOpen && !focusMode}
        data-focus-mode={focusMode}
        data-show-toolbar={settings.showToolbar}
        data-show-statusbar={settings.showStatusBar}
        data-show-tabs={settings.showTabs}
        data-overlay-layout={isOverlayLayout}
      >
        {/* Top Application Menu */}
        <header className="app-shell__menubar">
          <MenuBar />
        </header>

        {/* Global Storage Warning / Quota Banner */}
        <StorageBanner />

        {/* Main Application Body (Sidebar + Editor Area) */}
        <div className="app-shell__body">
          {/* Workspace Sidebar / Explorer & Resizer */}
          {sidebarOpen && !focusMode && (
            <>
              {isOverlayLayout && (
                <div
                  id="sidebar-backdrop"
                  className="app-shell__sidebar-backdrop"
                  onClick={() => setSidebarOpen(false)}
                  aria-hidden="true"
                />
              )}
              <aside
                className={`app-shell__sidebar ${isOverlayLayout ? 'app-shell__sidebar--overlay' : ''}`}
                aria-label="Explorer"
              >
                <Explorer />
              </aside>
              {!isOverlayLayout && (
                <div
                  id="sidebar-resizer"
                  className="app-shell__resizer"
                  onPointerDown={handlePointerDown}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize sidebar"
                  tabIndex={0}
                />
              )}
            </>
          )}

          {/* Main Editor & Tab Area */}
          <main className="app-shell__main">
            {/* TabBar */}
            {settings.showTabs && <TabBar />}

            {/* Editor area */}
            <div className="app-shell__editor-area">
              {activeTabId ? (
                <>
                  <EditorPane documentId={activeTabId} />
                  {outlineOpen && !focusMode && <OutlinePanel documentId={activeTabId} />}
                </>
              ) : (
                <div className="app-shell__welcome">
                  <WelcomeScreen />
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Bottom Status bar — unconditionally spans full application width */}
        {settings.showStatusBar && (
          <div className="app-shell__statusbar-wrapper">
            <StatusBar />
          </div>
        )}
      </div>

      {/* Global Modals / Overlays */}
      <ContextMenu />
      <CommandPalette />
      <WorkspaceSearchModal isOpen={searchOpen} onClose={closeSearch} />
      <SettingsDialog isOpen={settingsOpen} onClose={closeSettings} />
      <AboutModal isOpen={aboutOpen} onClose={closeAbout} />
      <ShareModal isOpen={shareOpen} onClose={closeShare} />

      {/* External File Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div id="file-drop-overlay" className="file-drop-overlay" aria-hidden="true">
          <div className="file-drop-overlay__box">
            <Upload size={40} className="file-drop-overlay__icon" />
            <h3 className="file-drop-overlay__title">Drop files to import into Scratchpad</h3>
            <p className="file-drop-overlay__subtitle">
              Supported formats: Markdown (.md), Plain Text (.txt), HTML (.html), JSON (.json)
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Welcome screen (shown when no document is open)
// ---------------------------------------------------------------------------

function WelcomeScreen() {
  const { openDocument, createDocument, documents } = useWorkspace()
  const { openCommandPalette, openAbout, openShare } = useUI()

  const recentDocs = documents.slice(0, 5)

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__content">
        <div className="welcome-screen__logo" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--sp-color-accent, #007acc)"/>
            <path d="M9 8h14M9 13h10M9 18h12M9 23h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="welcome-screen__title">Scratchpad</h1>
        <p className="welcome-screen__subtitle">
          Free Local-First Writing Workspace |{' '}
          <a
            href="https://sji.one/"
            target="_blank"
            rel="noopener noreferrer"
            className="welcome-screen__sji-link"
            title="SJI Web Products"
          >
            SJI
          </a>
        </p>

        <div className="welcome-screen__badges" aria-label="Privacy and storage highlights">
          <span className="welcome-screen__badge">100% Offline & Private</span>
          <span className="welcome-screen__badge">Zero Accounts</span>
          <span className="welcome-screen__badge">IndexedDB Storage</span>
        </div>

        <div className="welcome-screen__actions">
          <button
            id="welcome-create-rich-doc"
            className="welcome-screen__action welcome-screen__action--primary"
            onClick={() => createDocument('Untitled', 'rich', null)}
          >
            New Rich Document
          </button>

          <button
            id="welcome-create-markdown-doc"
            className="welcome-screen__action"
            onClick={() => createDocument('Untitled', 'markdown', null)}
          >
            New Markdown Document
          </button>

          <button
            id="welcome-create-plain-doc"
            className="welcome-screen__action"
            onClick={() => createDocument('Untitled', 'plain', null)}
          >
            New Plain Text
          </button>

          <button
            id="welcome-open-command-palette"
            className="welcome-screen__action"
            onClick={openCommandPalette}
          >
            Command Palette
            <kbd>Ctrl+Shift+P</kbd>
          </button>
        </div>

        {recentDocs.length > 0 && (
          <section className="welcome-screen__recent" aria-label="Recent documents">
            <h2>Recent</h2>
            <ul>
              {recentDocs.map((doc) => (
                <li key={doc.id}>
                  <button
                    id={`welcome-recent-${doc.id}`}
                    onClick={() => openDocument(doc.id)}
                    className="welcome-screen__recent-item"
                  >
                    {doc.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="welcome-screen__footer" aria-label="Product navigation and ecosystem">
          <div className="welcome-screen__footer-links">
            <button
              id="welcome-open-about"
              type="button"
              className="welcome-screen__footer-btn"
              onClick={openAbout}
            >
              About & Privacy
            </button>
            <span className="welcome-screen__footer-sep" aria-hidden="true">·</span>
            <button
              id="welcome-open-share"
              type="button"
              className="welcome-screen__footer-btn"
              onClick={openShare}
            >
              Share Scratchpad
            </button>
            <span className="welcome-screen__footer-sep" aria-hidden="true">·</span>
            <a
              id="welcome-link-sji-product"
              href="https://sji.one/products/scratchpad"
              target="_blank"
              rel="noopener noreferrer"
              className="welcome-screen__footer-link"
            >
              Scratchpad on SJI
            </a>
            <span className="welcome-screen__footer-sep" aria-hidden="true">·</span>
            <a
              id="welcome-link-sji-home"
              href="https://sji.one/"
              target="_blank"
              rel="noopener noreferrer"
              className="welcome-screen__footer-link"
            >
              SJI Home
            </a>
          </div>

          <div className="welcome-screen__network" aria-label="SJI network web products">
            <span className="welcome-screen__network-label">More SJI products:</span>
            <a href="https://tools.sji.one/" target="_blank" rel="noopener noreferrer" className="welcome-screen__network-link">Tools</a>
            <a href="https://calc.sji.one/" target="_blank" rel="noopener noreferrer" className="welcome-screen__network-link">Calc</a>
            <a href="https://time.sji.one/" target="_blank" rel="noopener noreferrer" className="welcome-screen__network-link">Time</a>
            <a href="https://shorty.sji.one/" target="_blank" rel="noopener noreferrer" className="welcome-screen__network-link">Shorty</a>
            <a href="https://tempbox.sji.one/" target="_blank" rel="noopener noreferrer" className="welcome-screen__network-link">TempBox</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
