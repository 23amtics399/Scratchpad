import { useState, useEffect, useRef, useCallback } from 'react'
import type { DocumentRecord, DocumentType } from '@/types/index.js'
import { documentService } from '@/services/DocumentService.js'
import { snapshotService } from '@/services/SnapshotService.js'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import { convertDocumentContent } from '@/services/ConversionService.js'
import { RichEditor } from './RichEditor/RichEditor.js'
import { CodeMirrorEditor } from './CodeMirrorEditor/CodeMirrorEditor.js'
import { VersionHistoryDrawer } from '@/components/VersionHistory/VersionHistoryDrawer.js'
import {
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  FileText,
  FileCode,
  File as FileIcon,
  ChevronDown,
  History as HistoryIcon,
  AlertTriangle,
} from 'lucide-react'
import { isQuotaExceededError, getStorageDiagnostics } from '@/utils/storageError.js'
import './EditorPane.css'

export interface EditorPaneProps {
  documentId: string
}

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error'

export function EditorPane({ documentId }: EditorPaneProps) {
  const { renameDocument, saveDocumentContent, changeDocumentType } = useWorkspace()
  const { focusMode, toggleFocusMode, showStorageBanner } = useUI()

  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [title, setTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  // Track last snapshot time for 10-minute periodic snapshots
  const lastSnapshotTimeRef = useRef<number>(Date.now())

  // Pending save data ref for debounced autosave & flush triggers
  const pendingDataRef = useRef<{
    content: string
    wordCount: number
    characterCount: number
  } | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ---------------------------------------------------------------------------
  // Flush Save
  // ---------------------------------------------------------------------------

  const flushSave = useCallback(async () => {
    if (!pendingDataRef.current) return

    const dataToSave = pendingDataRef.current

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    try {
      setSaveStatus('saving')
      await saveDocumentContent(
        documentId,
        dataToSave.content,
        dataToSave.wordCount,
        dataToSave.characterCount
      )
      // Only clear if no newer edit was made while saving was in-flight
      if (pendingDataRef.current === dataToSave) {
        pendingDataRef.current = null
      }
      setSaveStatus('saved')
    } catch (err) {
      console.error('Failed to save document:', err)
      setSaveStatus('error')
      // Note: pendingDataRef.current is preserved in memory so user never loses state!

      const isQuota = isQuotaExceededError(err)
      let diagText = ''
      try {
        const diag = await getStorageDiagnostics()
        if (diag) diagText = diag.text
      } catch {
        // Storage estimate may fail or be unsupported in some environments
      }

      showStorageBanner({
        message: isQuota
          ? 'Browser storage is full. Your current document is still open but could not be saved.'
          : 'Storage persistence failure. Your current document is still open in memory but could not be saved.',
        isQuota,
        diagnostics: diagText,
      })
    }
  }, [documentId, saveDocumentContent, showStorageBanner])

  const flushSaveRef = useRef(flushSave)
  flushSaveRef.current = flushSave

  // ---------------------------------------------------------------------------
  // Load Document
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let active = true

    // Flush any pending save from the previous document before switching
    flushSaveRef.current()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const loaded = await documentService.open(documentId)
        if (!active) return
        if (!loaded) {
          setError('Document not found or has been deleted.')
        } else {
          setDoc(loaded)
          setTitle(loaded.title)
          setSaveStatus('saved')
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      // Flush on unmount / document change
      flushSaveRef.current()
    }
  }, [documentId])

  // ---------------------------------------------------------------------------
  // Content Change Handler (Autosave with 1000ms debounce + 10m periodic snapshots)
  // ---------------------------------------------------------------------------

  const handleContentChange = useCallback(
    (content: string, wordCount: number, characterCount: number) => {
      pendingDataRef.current = { content, wordCount, characterCount }
      setSaveStatus('dirty')

      // Notify outline / listeners of live content change
      window.dispatchEvent(
        new CustomEvent('scratchpad:content-change', {
          detail: { documentId, content },
        })
      )

      // Periodic auto-snapshot (every 10 minutes when document is modified)
      if (Date.now() - lastSnapshotTimeRef.current >= 10 * 60 * 1000) {
        snapshotService.createSnapshot(documentId, 'Periodic autosave', content)
        lastSnapshotTimeRef.current = Date.now()
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        flushSave()
      }, 1000)
    },
    [documentId, flushSave]
  )

  // Listen for in-place document reload (e.g. from version history restoration)
  useEffect(() => {
    const handleReloadDoc = (e: Event) => {
      const ce = e as CustomEvent<{ documentId: string; content: string }>
      if (ce.detail?.documentId === documentId) {
        setDoc((prev) => (prev ? { ...prev, content: ce.detail.content } : null))
        setRevision((r) => r + 1)
        setSaveStatus('saved')
      }
    }

    const handleOpenHistory = () => {
      setHistoryDrawerOpen(true)
    }

    window.addEventListener('scratchpad:reload-document', handleReloadDoc)
    window.addEventListener('scratchpad:open-version-history', handleOpenHistory)

    return () => {
      window.removeEventListener('scratchpad:reload-document', handleReloadDoc)
      window.removeEventListener('scratchpad:open-version-history', handleOpenHistory)
    }
  }, [documentId])

  // ---------------------------------------------------------------------------
  // Flush Triggers: VisibilityChange, PageHide, Blur, Custom Save Event
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave()
      }
    }

    const handlePageHide = () => {
      flushSave()
    }

    const handleCustomSave = () => {
      flushSave()
    }

    const handleWindowBlur = () => {
      flushSave()
    }

    // Best-effort fallback
    const handleBeforeUnload = () => {
      flushSave()
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('scratchpad:save', handleCustomSave)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('scratchpad:save', handleCustomSave)
    }
  }, [flushSave])

  // Close type dropdown on outside click or viewport resize
  const typeMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showTypeMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false)
      }
    }
    const handleResize = () => setShowTypeMenu(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scratchpad:viewport-resize', handleResize)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scratchpad:viewport-resize', handleResize)
    }
  }, [showTypeMenu])

  // Close history drawer on viewport resize
  useEffect(() => {
    const handleResize = () => setHistoryDrawerOpen(false)
    window.addEventListener('scratchpad:viewport-resize', handleResize)
    return () => {
      window.removeEventListener('scratchpad:viewport-resize', handleResize)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Title Edit
  // ---------------------------------------------------------------------------

  const handleTitleBlur = async () => {
    setIsEditingTitle(false)
    if (!doc) return
    const trimmed = title.trim() || 'Untitled'
    setTitle(trimmed)
    if (trimmed !== doc.title) {
      await renameDocument(doc.id, trimmed)
      setDoc((prev) => (prev ? { ...prev, title: trimmed } : null))
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      if (doc) setTitle(doc.title)
      setIsEditingTitle(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Mode / Type Conversion
  // ---------------------------------------------------------------------------

  const handleTypeChange = async (newType: DocumentType) => {
    if (!doc || doc.type === newType) {
      setShowTypeMenu(false)
      return
    }

    // Flush any pending changes first
    await flushSave()

    // Determine converted content
    const convertedContent = convertDocumentContent(doc.content, doc.type, newType)

    await changeDocumentType(doc.id, newType, convertedContent)
    setDoc((prev) => (prev ? { ...prev, type: newType, content: convertedContent } : null))
    setShowTypeMenu(false)
  }

  if (loading) {
    return <div className="editor-pane__loading">Opening document…</div>
  }

  if (error || !doc) {
    return (
      <div className="editor-pane__error">
        <p>{error || 'Document could not be loaded.'}</p>
      </div>
    )
  }

  return (
    <div className="editor-pane">
      {/* Header Bar */}
      <header className="editor-pane__header" aria-label="Document toolbar">
        <div className="editor-pane__header-left">
          {/* Document Title (inline editable) */}
          <div className="editor-pane__title-wrapper">
            {isEditingTitle ? (
              <input
                type="text"
                className="editor-pane__title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
              />
            ) : (
              <h1
                className="editor-pane__title"
                onClick={() => setIsEditingTitle(true)}
                title={`${title || 'Untitled'} (Click to rename)`}
              >
                {title || 'Untitled'}
              </h1>
            )}
          </div>

          {/* Mode Selector Dropdown */}
          <div className="editor-pane__type-dropdown-wrapper" ref={typeMenuRef}>
            <button
              type="button"
              className="editor-pane__type-badge"
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              title="Switch document format mode"
              aria-label="Document format mode"
            >
              {doc.type === 'rich' ? (
                <FileText size={12} />
              ) : doc.type === 'markdown' ? (
                <FileCode size={12} />
              ) : (
                <FileIcon size={12} />
              )}
              <span>
                {doc.type === 'rich'
                  ? 'Rich Text'
                  : doc.type === 'markdown'
                  ? 'Markdown'
                  : 'Plain Text'}
              </span>
              <ChevronDown size={11} />
            </button>

            {showTypeMenu && (
              <div className="editor-pane__type-menu">
                <button
                  type="button"
                  className={`editor-pane__type-option ${doc.type === 'rich' ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange('rich')}
                >
                  <FileText size={13} />
                  <span>Rich Text</span>
                </button>
                <button
                  type="button"
                  className={`editor-pane__type-option ${doc.type === 'markdown' ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange('markdown')}
                >
                  <FileCode size={13} />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  className={`editor-pane__type-option ${doc.type === 'plain' ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange('plain')}
                >
                  <FileIcon size={13} />
                  <span>Plain Text</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="editor-pane__header-right">
          {/* Save Status Indicator */}
          <div className="editor-pane__save-status">
            {saveStatus === 'saved' && (
              <span className="save-status save-status--saved" title="All changes saved locally">
                <CheckCircle2 size={13} />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="save-status save-status--saving" title="Saving changes…">
                <Clock size={13} className="spin" />
                <span>Saving…</span>
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span
                className="save-status save-status--dirty"
                title="Unsaved changes (saving automatically…)"
              >
                <span className="dirty-dot" />
                <span>Unsaved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span
                className="save-status save-status--error"
                title="Failed to save changes! Storage may be full."
              >
                <AlertTriangle size={13} />
                <span>Save failed</span>
              </span>
            )}
          </div>

          {/* Version History Toggle */}
          <button
            type="button"
            className={`editor-pane__action-btn ${historyDrawerOpen ? 'is-active' : ''}`}
            onClick={() => setHistoryDrawerOpen(!historyDrawerOpen)}
            title="Version History / Checkpoints"
            aria-label="Version History"
          >
            <HistoryIcon size={14} />
          </button>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            className={`editor-pane__action-btn ${focusMode ? 'is-active' : ''}`}
            onClick={toggleFocusMode}
            title={focusMode ? 'Exit Focus Mode (Ctrl+Shift+F)' : 'Enter Focus Mode (Ctrl+Shift+F)'}
            aria-label="Toggle Focus Mode"
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="editor-pane__body">
        {doc.type === 'rich' ? (
          <RichEditor
            key={`rich-${doc.id}-${revision}`}
            documentId={doc.id}
            initialContent={doc.content}
            onChange={handleContentChange}
            onSaveRequest={flushSave}
          />
        ) : (
          <CodeMirrorEditor
            key={`cm-${doc.id}-${doc.type}-${revision}`}
            documentId={doc.id}
            initialContent={doc.content}
            mode={doc.type}
            onChange={handleContentChange}
          />
        )}
      </div>

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        documentId={doc.id}
        documentTitle={doc.title}
        documentType={doc.type}
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />
    </div>
  )
}
