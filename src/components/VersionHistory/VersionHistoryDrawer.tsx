import { useState, useEffect, useCallback } from 'react'
import {
  History,
  X,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Eye,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { snapshotService } from '@/services/SnapshotService.js'
import { extractSearchableText } from '@/utils/textExtractor.js'
import type { SnapshotRecord, DocumentType } from '@/types/index.js'
import './VersionHistoryDrawer.css'

interface VersionHistoryDrawerProps {
  documentId: string
  documentTitle: string
  documentType: DocumentType
  isOpen: boolean
  onClose: () => void
}

export function VersionHistoryDrawer({
  documentId,
  documentTitle,
  documentType,
  isOpen,
  onClose,
}: VersionHistoryDrawerProps) {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotRecord | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Load snapshots for document
  const loadSnapshots = useCallback(async () => {
    if (!documentId) return
    const list = await snapshotService.getSnapshots(documentId)
    setSnapshots(list)
    if (list.length > 0) {
      setSelectedSnapshot(list[0])
    } else {
      setSelectedSnapshot(null)
    }
  }, [documentId])

  useEffect(() => {
    if (isOpen) {
      loadSnapshots()
      setConfirmRestoreId(null)
      setConfirmDeleteId(null)
    }
  }, [isOpen, loadSnapshots])

  // Close or reset state on viewport resize
  useEffect(() => {
    const handleResize = () => {
      setConfirmRestoreId(null)
      setConfirmDeleteId(null)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scratchpad:viewport-resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scratchpad:viewport-resize', handleResize)
    }
  }, [])

  // Create manual snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documentId) return
    setIsCreating(true)
    try {
      await snapshotService.createSnapshot(documentId, newLabel.trim() || 'Manual checkpoint')
      setNewLabel('')
      await loadSnapshots()
    } finally {
      setIsCreating(false)
    }
  }

  // Restore snapshot with safety snapshot confirmation
  const handleConfirmRestore = async (snapshotId: string) => {
    setIsRestoring(true)
    try {
      await snapshotService.restoreSnapshot(documentId, snapshotId)
      setConfirmRestoreId(null)
      await loadSnapshots()
      onClose()
    } finally {
      setIsRestoring(false)
    }
  }

  // 2-step Delete snapshot
  const handleRequestDelete = (snapshotId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmRestoreId(null)
    setConfirmDeleteId(snapshotId)
  }

  const handleConfirmDelete = async (snapshotId: string) => {
    await snapshotService.deleteSnapshot(snapshotId)
    setConfirmDeleteId(null)
    await loadSnapshots()
  }

  if (!isOpen) return null

  const previewText = selectedSnapshot
    ? extractSearchableText(selectedSnapshot.content, documentType)
    : ''

  return (
    <div className="version-history-backdrop" onClick={onClose}>
      <div
        className="version-history-drawer"
        role="dialog"
        aria-label="Version History"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="version-history-header">
          <div className="version-history-header-title">
            <History size={16} />
            <span>Version History</span>
          </div>
          <button
            type="button"
            className="version-history-close-btn"
            onClick={onClose}
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="version-history-doc-info">
          <FileText size={14} className="version-history-doc-icon" />
          <span className="version-history-doc-title">{documentTitle}</span>
        </div>

        {/* Create Snapshot Form */}
        <form onSubmit={handleCreateSnapshot} className="version-history-create-form">
          <input
            type="text"
            className="version-history-label-input"
            placeholder="Checkpoint label (optional)…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button
            type="submit"
            className="version-history-btn version-history-btn--primary"
            disabled={isCreating}
          >
            <Plus size={14} style={{ marginRight: 4 }} />
            {isCreating ? 'Saving…' : 'Snapshot'}
          </button>
        </form>

        {/* Body Split View: List on Left, Preview on Right */}
        <div className="version-history-body">
          <div className="version-history-list">
            {snapshots.length === 0 ? (
              <div className="version-history-empty">
                No saved snapshots yet. Snapshots are created automatically periodically or when you click Snapshot.
              </div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = selectedSnapshot?.id === snap.id
                const isConfirmingRestore = confirmRestoreId === snap.id
                const isConfirmingDelete = confirmDeleteId === snap.id
                return (
                  <div
                    key={snap.id}
                    className={`version-history-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedSnapshot(snap)}
                  >
                    <div className="version-history-item-top">
                      <span className="version-history-item-label">
                        {snap.label || 'Snapshot'}
                      </span>
                      <button
                        type="button"
                        className="version-history-item-del-btn"
                        onClick={(e) => handleRequestDelete(snap.id, e)}
                        title="Delete snapshot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="version-history-item-time">
                      <Clock size={11} style={{ marginRight: 3 }} />
                      {new Date(snap.createdAt).toLocaleString()}
                    </div>

                    {isConfirmingDelete && (
                      <div
                        className="version-history-confirm-box version-history-confirm-box--delete"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="confirm-text confirm-text--danger">
                          <AlertCircle size={12} style={{ marginRight: 4 }} />
                          Permanently delete this snapshot? This cannot be undone.
                        </div>
                        <div className="confirm-actions">
                          <button
                            type="button"
                            className="confirm-btn confirm-btn--danger"
                            onClick={() => handleConfirmDelete(snap.id)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="confirm-btn"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isConfirmingRestore && (
                      <div
                        className="version-history-confirm-box"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="confirm-text">
                          <AlertCircle size={12} style={{ marginRight: 4 }} />
                          Current version will be saved as a safety snapshot first.
                        </div>
                        <div className="confirm-actions">
                          <button
                            type="button"
                            className="confirm-btn confirm-btn--yes"
                            onClick={() => handleConfirmRestore(snap.id)}
                            disabled={isRestoring}
                          >
                            {isRestoring ? 'Restoring…' : 'Restore'}
                          </button>
                          <button
                            type="button"
                            className="confirm-btn"
                            onClick={() => setConfirmRestoreId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!isConfirmingRestore && !isConfirmingDelete && (
                      <button
                        type="button"
                        className="version-history-restore-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteId(null)
                          setConfirmRestoreId(snap.id)
                        }}
                      >
                        <RotateCcw size={12} style={{ marginRight: 4 }} />
                        Restore
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Preview Panel */}
          <div className="version-history-preview">
            <div className="preview-header">
              <Eye size={13} style={{ marginRight: 4 }} />
              <span>Snapshot Preview</span>
            </div>
            {selectedSnapshot ? (
              <div className="preview-content">
                <div className="preview-meta-info">
                  <strong>{selectedSnapshot.label || 'Snapshot'}</strong>
                  <span>{new Date(selectedSnapshot.createdAt).toLocaleString()}</span>
                </div>
                <div className="preview-text-box">
                  {previewText || '(Empty document)'}
                </div>
              </div>
            ) : (
              <div className="preview-empty">Select a snapshot to preview its text content</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
