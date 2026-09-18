import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText,
  FileCode,
  File as FileIcon,
  FolderPlus,
  X,
  Sliders,
  Layers,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  Search,
  Printer,
  History,
  Info,
} from 'lucide-react'
import { useUI } from '@/contexts/UIContext.js'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useSettings } from '@/contexts/SettingsContext.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { exportService } from '@/services/ExportService.js'
import { documentRepository } from '@/storage/repositories/index.js'
import './CommandPalette.css'

interface PaletteCommand {
  id: string
  title: string
  description?: string
  category: 'File' | 'View' | 'Theme' | 'Recent' | 'Settings'
  icon: typeof FileText
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const {
    commandPaletteOpen,
    closeCommandPalette,
    toggleSidebar,
    toggleOutline,
    toggleFocusMode,
    openSettings,
    openSearch,
  } = useUI()
  const {
    documents,
    activeTabId,
    openDocument,
    createDocument,
    createFolder,
    closeTab,
    closeAllTabs,
    workspace,
  } = useWorkspace()
  const { updateSettings } = useSettings()

  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [commandPaletteOpen])

  // All static + dynamic commands
  const allCommands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [
      // File
      {
        id: 'new-rich',
        title: 'New Rich Text Document',
        description: 'Create a formatted rich document with headings and styles',
        category: 'File',
        icon: FileText,
        shortcut: 'Ctrl+N',
        action: () => createDocument('Untitled', 'rich', null),
      },
      {
        id: 'new-markdown',
        title: 'New Markdown Document',
        description: 'Create a raw markdown document',
        category: 'File',
        icon: FileCode,
        action: () => createDocument('Untitled', 'markdown', null),
      },
      {
        id: 'new-plain',
        title: 'New Plain Text Document',
        description: 'Create an unformatted plain text document',
        category: 'File',
        icon: FileIcon,
        action: () => createDocument('Untitled', 'plain', null),
      },
      {
        id: 'new-folder',
        title: 'New Folder',
        description: 'Create a new folder in the workspace',
        category: 'File',
        icon: FolderPlus,
        action: () => createFolder('New Folder', null),
      },
      {
        id: 'close-tab',
        title: 'Close Active Tab',
        category: 'File',
        icon: X,
        shortcut: 'Ctrl+W',
        action: () => {
          if (activeTabId) closeTab(activeTabId)
        },
      },
      {
        id: 'close-all-tabs',
        title: 'Close All Tabs',
        category: 'File',
        icon: Layers,
        action: () => closeAllTabs(),
      },
      {
        id: 'export-backup',
        title: 'Export Workspace Backup (JSON)',
        description: 'Download full workspace data and attachments to a JSON file',
        category: 'File',
        icon: Download,
        action: async () => {
          if (!workspace) return
          const backup = await workspaceService.generateBackup(workspace.id, true)
          const json = JSON.stringify(backup, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `scratchpad-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(url)
        },
      },
      {
        id: 'import-backup',
        title: 'Restore Workspace Backup (JSON)',
        description: 'Merge or restore from a previous backup file',
        category: 'File',
        icon: Upload,
        action: () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.json'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file || !workspace) return
            try {
              const text = await file.text()
              const parsed: unknown = JSON.parse(text)
              if (workspaceService.validateBackup(parsed)) {
                await workspaceService.restoreBackup(parsed, workspace.id, 'merge')
                window.location.reload()
              } else {
                alert('Invalid backup file: Format does not match Scratchpad workspace specification.')
              }
            } catch (err) {
              alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
            }
          }
          input.click()
        },
      },
      {
        id: 'export-md',
        title: 'Export Active Note: Markdown (.md)',
        category: 'File',
        icon: Download,
        action: async () => {
          if (!activeTabId) return
          const doc = await documentRepository.getById(activeTabId)
          if (doc) exportService.exportDocument(doc, 'md')
        },
      },
      {
        id: 'export-html',
        title: 'Export Active Note: HTML (.html)',
        category: 'File',
        icon: Download,
        action: async () => {
          if (!activeTabId) return
          const doc = await documentRepository.getById(activeTabId)
          if (doc) exportService.exportDocument(doc, 'html')
        },
      },
      {
        id: 'export-txt',
        title: 'Export Active Note: Plain Text (.txt)',
        category: 'File',
        icon: Download,
        action: async () => {
          if (!activeTabId) return
          const doc = await documentRepository.getById(activeTabId)
          if (doc) exportService.exportDocument(doc, 'txt')
        },
      },
      {
        id: 'export-json',
        title: 'Export Active Note: Document JSON (.json)',
        category: 'File',
        icon: Download,
        action: async () => {
          if (!activeTabId) return
          const doc = await documentRepository.getById(activeTabId)
          if (doc) exportService.exportDocument(doc, 'json')
        },
      },
      {
        id: 'print-doc',
        title: 'Print / Save Active Note as PDF',
        category: 'File',
        icon: Printer,
        shortcut: 'Ctrl+P',
        action: () => exportService.print(),
      },
      {
        id: 'doc-properties',
        title: 'Document: Properties…',
        description: 'View size, statistics, and metadata of active document',
        category: 'File',
        icon: Info,
        action: () => window.dispatchEvent(new CustomEvent('scratchpad:open-properties')),
      },
      // View
      {
        id: 'workspace-search',
        title: 'Workspace Search: Search Across All Notes',
        category: 'View',
        icon: Search,
        shortcut: 'Ctrl+Alt+F',
        action: () => openSearch(),
      },
      {
        id: 'find-doc',
        title: 'Find in Document',
        category: 'View',
        icon: Search,
        shortcut: 'Ctrl+F',
        action: () => window.dispatchEvent(new CustomEvent('scratchpad:open-find')),
      },
      {
        id: 'replace-doc',
        title: 'Replace in Document',
        category: 'View',
        icon: Search,
        shortcut: 'Ctrl+H',
        action: () => window.dispatchEvent(new CustomEvent('scratchpad:open-replace')),
      },
      {
        id: 'version-history',
        title: 'Version History / Checkpoints',
        category: 'View',
        icon: History,
        action: () => window.dispatchEvent(new CustomEvent('scratchpad:open-version-history')),
      },
      {
        id: 'toggle-sidebar',
        title: 'Toggle Explorer Sidebar',
        category: 'View',
        icon: Sliders,
        action: () => toggleSidebar(),
      },
      {
        id: 'toggle-focus-mode',
        title: 'Toggle Focus Mode',
        description: 'Minimize chrome and focus on the editor',
        category: 'View',
        icon: Sliders,
        shortcut: 'Ctrl+Shift+F',
        action: () => toggleFocusMode(),
      },
      {
        id: 'toggle-outline',
        title: 'Toggle Document Outline',
        category: 'View',
        icon: Sliders,
        action: () => toggleOutline(),
      },
      // Theme
      {
        id: 'theme-light',
        title: 'Theme: Switch to Light Theme',
        category: 'Theme',
        icon: Sun,
        action: () => updateSettings({ theme: 'light' }),
      },
      {
        id: 'theme-dark',
        title: 'Theme: Switch to Dark Theme',
        category: 'Theme',
        icon: Moon,
        action: () => updateSettings({ theme: 'dark' }),
      },
      {
        id: 'theme-system',
        title: 'Theme: Follow System Theme',
        category: 'Theme',
        icon: Laptop,
        action: () => updateSettings({ theme: 'system' }),
      },
      // Settings
      {
        id: 'open-settings',
        title: 'Preferences / Settings',
        category: 'Settings',
        icon: Sliders,
        action: () => openSettings(),
      },
    ]

    // Dynamic document jump commands
    for (const doc of documents) {
      list.push({
        id: `doc-${doc.id}`,
        title: `Open: ${doc.title}`,
        description: `${doc.type.toUpperCase()} • Last edited ${new Date(doc.updatedAt).toLocaleDateString()}`,
        category: 'Recent',
        icon: doc.type === 'markdown' ? FileCode : doc.type === 'plain' ? FileIcon : FileText,
        action: () => openDocument(doc.id),
      })
    }

    return list
  }, [
    documents,
    activeTabId,
    workspace,
    openDocument,
    createDocument,
    createFolder,
    closeTab,
    closeAllTabs,
    toggleSidebar,
    toggleFocusMode,
    toggleOutline,
    updateSettings,
    openSettings,
    openSearch,
  ])

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands
    const query = search.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query)
    )
  }, [allCommands, search])

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!commandPaletteOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCommandPalette()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (filteredCommands.length ? (prev + 1) % filteredCommands.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          filteredCommands.length ? (prev <= 0 ? filteredCommands.length - 1 : prev - 1) : 0
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected) {
          selected.action()
          closeCommandPalette()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, closeCommandPalette, filteredCommands, selectedIndex])

  // Keep selected item visible in list
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-cmd-index="${selectedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!commandPaletteOpen) return null

  return createPortal(
    <div
      id="scratchpad-command-palette-backdrop"
      className="command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommandPalette()
      }}
    >
      <div id="scratchpad-command-palette" className="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette">
        {/* Search header */}
        <div className="command-palette__search-box">
          <Search size={16} className="command-palette__search-icon" />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            className="command-palette__input"
            placeholder="Type a command or search notes... (Ctrl+Shift+P)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <kbd className="command-palette__esc-hint">ESC</kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="command-palette__list" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">No matching commands found</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon
              const isSelected = idx === selectedIndex

              return (
                <button
                  key={cmd.id}
                  id={`cmd-${cmd.id}`}
                  data-cmd-index={idx}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}`}
                  onClick={() => {
                    cmd.action()
                    closeCommandPalette()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="command-palette__item-icon">
                    <Icon size={16} />
                  </div>

                  <div className="command-palette__item-info">
                    <div className="command-palette__item-title">{cmd.title}</div>
                    {cmd.description && (
                      <div className="command-palette__item-desc">{cmd.description}</div>
                    )}
                  </div>

                  <span className="command-palette__item-category">{cmd.category}</span>
                  {cmd.shortcut && (
                    <kbd className="command-palette__item-shortcut">{cmd.shortcut}</kbd>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer tip */}
        <div className="command-palette__footer">
          <span>
            Navigate <kbd>↑</kbd> <kbd>↓</kbd>
          </span>
          <span>
            Select <kbd>↵</kbd>
          </span>
          <span>
            Dismiss <kbd>esc</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
