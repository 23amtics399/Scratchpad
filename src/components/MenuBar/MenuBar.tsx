import React, { useState, useRef, useEffect } from 'react'
import {
  FileText,
  FileCode,
  File as FileIcon,
  FolderPlus,
  X,
  Layers,
  Search,
  Download,
  Upload,
  Sun,
  Moon,
  Laptop,
  HelpCircle,
  Keyboard,
  Sliders,
  Check,
  Printer,
  History,
  Info,
  Share2,
  Shield,
  Globe,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import { useSettings } from '@/contexts/SettingsContext.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { exportService } from '@/services/ExportService.js'
import { importService } from '@/services/ImportService.js'
import { documentRepository } from '@/storage/repositories/index.js'
import type { DocumentType } from '@/types/index.js'
import './MenuBar.css'

type MenuId = 'file' | 'edit' | 'view' | 'help' | null

export function MenuBar() {
  const {
    activeTabId,
    createDocument,
    createFolder,
    closeTab,
    closeAllTabs,
    workspace,
    reload,
  } = useWorkspace()

  const {
    toggleSidebar,
    toggleOutline,
    toggleFocusMode,
    openCommandPalette,
    openSettings,
    openSearch,
    openAbout,
    openShare,
  } = useUI()

  const { settings, updateSettings } = useSettings()

  const [openMenu, setOpenMenu] = useState<MenuId>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    if (!openMenu) return

    const handlePointerDown = (e: PointerEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  const handleBackupExport = async () => {
    if (!workspace) return
    try {
      const backup = await workspaceService.generateBackup(workspace.id, true)
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scratchpad-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspace) return
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      if (!workspaceService.validateBackup(parsed)) {
        alert('Invalid backup file: Format does not match Scratchpad workspace specification.')
        return
      }
      if (confirm('Restore backup? This will merge documents and folders into your workspace.')) {
        await workspaceService.restoreBackup(parsed, workspace.id, 'merge')
        await reload()
        alert('Backup restored successfully!')
      }
    } catch (err) {
      alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExportDoc = async (format: 'md' | 'html' | 'txt' | 'json') => {
    if (!activeTabId) return
    const doc = await documentRepository.getById(activeTabId)
    if (doc) {
      await exportService.exportDocument(doc, format)
    }
    setOpenMenu(null)
  }

  const handlePrintDoc = () => {
    exportService.print()
    setOpenMenu(null)
  }

  const handleGeneralImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspace) return
    try {
      const res = await importService.parseImportFile(file)
      if (res.kind === 'workspace-backup') {
        if (confirm('Restore workspace backup? This will merge documents and folders.')) {
          await workspaceService.restoreBackup(res.data, workspace.id, 'merge')
          await reload()
          alert('Workspace backup restored successfully!')
        }
      } else {
        const created = await createDocument(res.title, res.type, null)
        if (created && res.content) {
          await documentRepository.save(created.id, res.content, 0, 0, res.type)
          await reload()
        }
      }
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = ''
      setOpenMenu(null)
    }
  }

  const triggerNewDoc = (type: DocumentType) => {
    createDocument('Untitled', type, null)
    setOpenMenu(null)
  }

  return (
    <nav ref={menuBarRef} id="scratchpad-menubar" className="menubar" aria-label="Application Menu">
      {/* Hidden file input for backup restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleBackupImport}
      />
      {/* Hidden file input for general file import */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".md,.markdown,.html,.htm,.txt,.json"
        style={{ display: 'none' }}
        onChange={handleGeneralImport}
      />

      {/* Brand logo / title */}
      <div className="menubar__brand">
        <div className="menubar__logo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--sp-color-accent, #007acc)" />
            <path d="M8 9h16M8 15h12M8 21h14M8 26h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="menubar__title">Scratchpad</span>
      </div>

      {/* Menus */}
      <div className="menubar__menus" role="menubar">
        {/* FILE MENU */}
        <div className="menubar__item-container">
          <button
            id="menu-file"
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === 'file'}
            className={`menubar__btn ${openMenu === 'file' ? 'menubar__btn--active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('file')
            }}
          >
            File
          </button>

          {openMenu === 'file' && (
            <div className="menubar__dropdown" role="menu">
              <button
                id="menu-item-new-rich"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => triggerNewDoc('rich')}
              >
                <FileText size={14} />
                <span>New Rich Note</span>
                <kbd>Ctrl+N</kbd>
              </button>

              <button
                id="menu-item-new-markdown"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => triggerNewDoc('markdown')}
              >
                <FileCode size={14} />
                <span>New Markdown Document</span>
              </button>

              <button
                id="menu-item-new-plain"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => triggerNewDoc('plain')}
              >
                <FileIcon size={14} />
                <span>New Plain Text Note</span>
              </button>

              <button
                id="menu-item-new-folder"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  createFolder('New Folder', null)
                  setOpenMenu(null)
                }}
              >
                <FolderPlus size={14} />
                <span>New Folder</span>
              </button>

              <div className="menubar__dropdown-separator" />

              <button
                id="menu-item-close-tab"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => {
                  if (activeTabId) closeTab(activeTabId)
                  setOpenMenu(null)
                }}
              >
                <X size={14} />
                <span>Close Tab</span>
                <kbd>Ctrl+W</kbd>
              </button>

              <button
                id="menu-item-close-all-tabs"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  closeAllTabs()
                  setOpenMenu(null)
                }}
              >
                <Layers size={14} />
                <span>Close All Tabs</span>
              </button>

              <button
                id="menu-item-document-properties"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('scratchpad:open-properties'))
                  setOpenMenu(null)
                }}
              >
                <Info size={14} />
                <span>Document Properties…</span>
              </button>

              <div className="menubar__dropdown-separator" />
              <div className="menubar__dropdown-header">Export Active Note</div>

              <button
                id="menu-item-export-md"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => handleExportDoc('md')}
              >
                <Download size={14} />
                <span>Export Markdown (.md)</span>
              </button>

              <button
                id="menu-item-export-html"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => handleExportDoc('html')}
              >
                <Download size={14} />
                <span>Export HTML (.html)</span>
              </button>

              <button
                id="menu-item-export-txt"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => handleExportDoc('txt')}
              >
                <Download size={14} />
                <span>Export Plain Text (.txt)</span>
              </button>

              <button
                id="menu-item-export-json"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => handleExportDoc('json')}
              >
                <Download size={14} />
                <span>Export Document JSON</span>
              </button>

              <button
                id="menu-item-print"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={handlePrintDoc}
              >
                <Printer size={14} />
                <span>Print / Save as PDF…</span>
                <kbd>Ctrl+P</kbd>
              </button>

              <div className="menubar__dropdown-separator" />
              <div className="menubar__dropdown-header">Import & Workspace</div>

              <button
                id="menu-item-import-file"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  importFileInputRef.current?.click()
                }}
              >
                <Upload size={14} />
                <span>Import File (.md, .html, .txt, .json)...</span>
              </button>

              <button
                id="menu-item-export-backup"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  handleBackupExport()
                  setOpenMenu(null)
                }}
              >
                <Download size={14} />
                <span>Export Workspace Backup (Full)...</span>
              </button>

              <button
                id="menu-item-import-backup"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  fileInputRef.current?.click()
                  setOpenMenu(null)
                }}
              >
                <Upload size={14} />
                <span>Restore Workspace Backup...</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="menubar__item-container">
          <button
            id="menu-edit"
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === 'edit'}
            className={`menubar__btn ${openMenu === 'edit' ? 'menubar__btn--active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('edit')
            }}
          >
            Edit
          </button>

          {openMenu === 'edit' && (
            <div className="menubar__dropdown" role="menu">
              <button
                id="menu-item-undo"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  document.execCommand('undo')
                  setOpenMenu(null)
                }}
              >
                <span>Undo</span>
                <kbd>Ctrl+Z</kbd>
              </button>

              <button
                id="menu-item-redo"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  document.execCommand('redo')
                  setOpenMenu(null)
                }}
              >
                <span>Redo</span>
                <kbd>Ctrl+Y</kbd>
              </button>

              <div className="menubar__dropdown-separator" />

              <button
                id="menu-item-cut"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  document.execCommand('cut')
                  setOpenMenu(null)
                }}
              >
                <span>Cut</span>
                <kbd>Ctrl+X</kbd>
              </button>

              <button
                id="menu-item-copy"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  document.execCommand('copy')
                  setOpenMenu(null)
                }}
              >
                <span>Copy</span>
                <kbd>Ctrl+C</kbd>
              </button>

              <div className="menubar__dropdown-separator" />

              <button
                id="menu-item-find"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('scratchpad:open-find'))
                  setOpenMenu(null)
                }}
              >
                <Search size={14} />
                <span>Find in Document...</span>
                <kbd>Ctrl+F</kbd>
              </button>

              <button
                id="menu-item-replace"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('scratchpad:open-replace'))
                  setOpenMenu(null)
                }}
              >
                <Search size={14} />
                <span>Replace in Document...</span>
                <kbd>Ctrl+H</kbd>
              </button>

              <button
                id="menu-item-find-workspace"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openSearch()
                  setOpenMenu(null)
                }}
              >
                <Search size={14} />
                <span>Find in Workspace...</span>
                <kbd>Ctrl+Alt+F</kbd>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="menubar__item-container">
          <button
            id="menu-view"
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === 'view'}
            className={`menubar__btn ${openMenu === 'view' ? 'menubar__btn--active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('view')
            }}
          >
            View
          </button>

          {openMenu === 'view' && (
            <div className="menubar__dropdown" role="menu">
              <button
                id="menu-item-command-palette"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openCommandPalette()
                  setOpenMenu(null)
                }}
              >
                <Sliders size={14} />
                <span>Command Palette...</span>
                <kbd>Ctrl+Shift+P</kbd>
              </button>

              <button
                id="menu-item-find-workspace-view"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openSearch()
                  setOpenMenu(null)
                }}
              >
                <Search size={14} />
                <span>Workspace Search...</span>
                <kbd>Ctrl+Alt+F</kbd>
              </button>

              <button
                id="menu-item-version-history-view"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                disabled={!activeTabId}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('scratchpad:open-version-history'))
                  setOpenMenu(null)
                }}
              >
                <History size={14} />
                <span>Version History / Snapshots</span>
              </button>

              <div className="menubar__dropdown-separator" />

              <button
                id="menu-item-toggle-sidebar"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  toggleSidebar()
                  setOpenMenu(null)
                }}
              >
                <span>Toggle Explorer</span>
              </button>

              <button
                id="menu-item-toggle-focus-mode"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  toggleFocusMode()
                  setOpenMenu(null)
                }}
              >
                <span>Toggle Focus Mode</span>
                <kbd>Ctrl+Shift+F</kbd>
              </button>

              <button
                id="menu-item-toggle-outline"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  toggleOutline()
                  setOpenMenu(null)
                }}
              >
                <span>Toggle Document Outline</span>
              </button>

              <div className="menubar__dropdown-separator" />

              <div className="menubar__dropdown-header">Theme</div>

              <button
                id="menu-item-theme-light"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  updateSettings({ theme: 'light' })
                  setOpenMenu(null)
                }}
              >
                <Sun size={14} />
                <span>Light Theme</span>
                {settings.theme === 'light' && <Check size={14} className="menubar__dropdown-check" />}
              </button>

              <button
                id="menu-item-theme-dark"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  updateSettings({ theme: 'dark' })
                  setOpenMenu(null)
                }}
              >
                <Moon size={14} />
                <span>Dark Theme</span>
                {settings.theme === 'dark' && <Check size={14} className="menubar__dropdown-check" />}
              </button>

              <button
                id="menu-item-theme-system"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  updateSettings({ theme: 'system' })
                  setOpenMenu(null)
                }}
              >
                <Laptop size={14} />
                <span>System Preference</span>
                {settings.theme === 'system' && <Check size={14} className="menubar__dropdown-check" />}
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="menubar__item-container">
          <button
            id="menu-help"
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === 'help'}
            className={`menubar__btn ${openMenu === 'help' ? 'menubar__btn--active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            onMouseEnter={() => {
              if (openMenu) setOpenMenu('help')
            }}
          >
            Help
          </button>

          {openMenu === 'help' && (
            <div className="menubar__dropdown" role="menu">
              <button
                id="menu-item-keyboard-shortcuts"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openCommandPalette()
                  setOpenMenu(null)
                }}
              >
                <Keyboard size={14} />
                <span>Command Palette & Shortcuts</span>
                <kbd>Ctrl+Shift+P</kbd>
              </button>

              <button
                id="menu-item-preferences"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openSettings()
                  setOpenMenu(null)
                }}
              >
                <Sliders size={14} />
                <span>Preferences</span>
              </button>

              <div className="menubar__dropdown-separator" />

              <button
                id="menu-item-share"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openShare()
                  setOpenMenu(null)
                }}
              >
                <Share2 size={14} />
                <span>Share Scratchpad...</span>
              </button>

              <button
                id="menu-item-privacy"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openAbout()
                  setOpenMenu(null)
                }}
              >
                <Shield size={14} />
                <span>Privacy & Offline Storage</span>
              </button>

              <button
                id="menu-item-about"
                type="button"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => {
                  openAbout()
                  setOpenMenu(null)
                }}
              >
                <HelpCircle size={14} />
                <span>About Scratchpad</span>
              </button>

              <div className="menubar__dropdown-separator" />
              <div className="menubar__dropdown-header">SJI Network</div>

              <a
                id="menu-item-sji-product"
                href="https://sji.one/products/scratchpad"
                target="_blank"
                rel="noopener noreferrer"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <Globe size={14} />
                <span>Scratchpad on SJI</span>
              </a>

              <a
                id="menu-item-sji-home"
                href="https://sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="menubar__dropdown-item"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <Globe size={14} />
                <span>Explore SJI Products</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
