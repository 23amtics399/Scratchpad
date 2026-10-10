import { useMemo } from 'react'
import {
  Columns,
  CheckCircle2,
  Folder,
  Sun,
  Moon,
  HardDrive,
  AlertTriangle,
  Share2,
  Info,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import { useSettings } from '@/contexts/SettingsContext.js'
import './StatusBar.css'

export function StatusBar() {
  const { activeTabId, documents, folders, workspace } = useWorkspace()
  const { toggleSidebar, sidebarOpen, storageBanner, openAbout, openShare } = useUI()
  const { settings, updateSettings } = useSettings()

  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeTabId)
  }, [documents, activeTabId])

  const folderName = useMemo(() => {
    if (!activeDoc?.folderId) return null
    return folders.find((f) => f.id === activeDoc.folderId)?.name ?? null
  }, [activeDoc, folders])

  const formatDocType = (type?: string) => {
    switch (type) {
      case 'markdown':
        return 'Markdown'
      case 'plain':
        return 'Plain Text'
      case 'rich':
        return 'Rich Text'
      default:
        return 'Scratchpad'
    }
  }

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: next })
  }

  return (
    <footer id="scratchpad-statusbar" className="statusbar" role="status" aria-label="Status bar">
      {/* Left Section: Document information flow */}
      <div className="statusbar__section statusbar__section--left">
        <button
          id="statusbar-toggle-sidebar"
          type="button"
          className={`statusbar__btn ${sidebarOpen ? 'statusbar__btn--active' : ''}`}
          title={sidebarOpen ? 'Hide Explorer' : 'Show Explorer'}
          aria-label="Toggle Explorer"
          onClick={toggleSidebar}
        >
          <Columns size={13} />
          <span>Explorer</span>
        </button>

        <span className="statusbar__divider" aria-hidden="true" />

        <span className="statusbar__item statusbar__item--type" title={`Document type: ${formatDocType(activeDoc?.type)}`}>
          {formatDocType(activeDoc?.type)}
        </span>

        {folderName && (
          <>
            <span className="statusbar__divider statusbar__divider--desktop-only" aria-hidden="true" />
            <span className="statusbar__item statusbar__item--folder statusbar__desktop-only" title={`Folder: ${folderName}`}>
              <Folder size={12} />
              <span>{folderName}</span>
            </span>
          </>
        )}

        <span className="statusbar__divider" aria-hidden="true" />

        {storageBanner ? (
          <span
            className="statusbar__item statusbar__item--storage-error"
            title={storageBanner.message}
            style={{ color: 'var(--sp-color-error, #f14c4c)' }}
          >
            <AlertTriangle size={12} className="statusbar__save-icon" />
            <span>Storage warning</span>
          </span>
        ) : (
          <span className="statusbar__item statusbar__item--saved" title="Stored locally in browser IndexedDB">
            <CheckCircle2 size={12} className="statusbar__save-icon" />
            <span>Saved locally</span>
          </span>
        )}

        {activeDoc && (
          <>
            <span className="statusbar__divider statusbar__divider--tablet" aria-hidden="true" />
            <span className="statusbar__item statusbar__item--count statusbar__hide-mobile" id="statusbar-word-count" title="Word count">
              {activeDoc.wordCount} {activeDoc.wordCount === 1 ? 'word' : 'words'}
            </span>
            <span className="statusbar__divider statusbar__divider--desktop-only" aria-hidden="true" />
            <span className="statusbar__item statusbar__item--count statusbar__desktop-only" id="statusbar-char-count" title="Character count">
              {activeDoc.characterCount} {activeDoc.characterCount === 1 ? 'character' : 'characters'}
            </span>
          </>
        )}
      </div>

      {/* Right Section: Workspace & Preferences */}
      <div className="statusbar__section statusbar__section--right">
        <button
          id="statusbar-share-btn"
          type="button"
          className="statusbar__btn"
          title="Share Scratchpad"
          aria-label="Share Scratchpad"
          onClick={openShare}
        >
          <Share2 size={12} />
          <span className="statusbar__theme-text statusbar__hide-mobile">Share</span>
        </button>

        <span className="statusbar__divider" aria-hidden="true" />

        <button
          id="statusbar-about-btn"
          type="button"
          className="statusbar__btn"
          title="About Scratchpad & Privacy"
          aria-label="About Scratchpad"
          onClick={openAbout}
        >
          <Info size={12} />
          <span className="statusbar__theme-text statusbar__hide-mobile">About</span>
        </button>

        <span className="statusbar__divider" aria-hidden="true" />

        <a
          id="statusbar-sji-link"
          href="https://sji.one/"
          target="_blank"
          rel="noopener noreferrer"
          className="statusbar__btn statusbar__sji-link"
          title="SJI — Focused Web Products for Everyday Work"
          aria-label="SJI Web Products"
        >
          <span>SJI</span>
        </a>

        <span className="statusbar__divider statusbar__divider--desktop-only" aria-hidden="true" />

        <button
          id="statusbar-toggle-theme"
          type="button"
          className="statusbar__btn"
          title={`Switch Theme (Current: ${settings.theme})`}
          aria-label="Toggle Theme"
          onClick={toggleTheme}
        >
          {settings.theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
          <span className="statusbar__theme-text statusbar__hide-mobile">{settings.theme}</span>
        </button>

        <span className="statusbar__divider statusbar__divider--desktop-only" aria-hidden="true" />

        <span className="statusbar__item statusbar__item--workspace statusbar__desktop-only" title={workspace?.name ?? 'Local Workspace'}>
          <HardDrive size={12} />
          <span>{workspace?.name ?? 'Workspace'}</span>
        </span>
      </div>
    </footer>
  )
}
