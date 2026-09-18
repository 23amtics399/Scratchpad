import { useState, useEffect } from 'react'
import {
  FileText,
  FileCode,
  File as FileIcon,
  X,
  Folder,
  Calendar,
  Clock,
  HardDrive,
  Paperclip,
  Type,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { documentService } from '@/services/DocumentService.js'
import { attachmentService } from '@/services/AttachmentService.js'
import type { DocumentMeta, DocumentRecord, AttachmentRecord } from '@/types/index.js'
import './DocumentPropertiesModal.css'

export interface DocumentPropertiesModalProps {
  document: DocumentMeta | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentPropertiesModal({
  document: meta,
  isOpen,
  onClose,
}: DocumentPropertiesModalProps) {
  const { folders } = useWorkspace()
  const [docRecord, setDocRecord] = useState<DocumentRecord | null>(null)
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !meta) {
      setDocRecord(null)
      setAttachments([])
      return
    }

    let active = true
    setLoading(true)

    Promise.all([
      documentService.getById(meta.id),
      attachmentService.getByDocument(meta.id),
    ])
      .then(([doc, atts]) => {
        if (!active) return
        setDocRecord(doc || null)
        setAttachments(atts)
      })
      .catch((err) => {
        console.error('Failed to load document properties:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, meta])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !meta) return null

  const folderName = meta.folderId
    ? folders.find((f) => f.id === meta.folderId)?.name ?? 'Unknown Folder'
    : 'Root (Workspace)'

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const contentSizeBytes = docRecord?.content
    ? new Blob([docRecord.content]).size
    : 0

  const totalAttachmentBytes = attachments.reduce((acc, a) => acc + a.size, 0)
  const totalSizeBytes = contentSizeBytes + totalAttachmentBytes

  const getTypeIcon = () => {
    switch (meta.type) {
      case 'markdown':
        return <FileCode size={20} className="doc-prop-icon doc-prop-icon--md" />
      case 'plain':
        return <FileIcon size={20} className="doc-prop-icon doc-prop-icon--plain" />
      case 'rich':
      default:
        return <FileText size={20} className="doc-prop-icon doc-prop-icon--rich" />
    }
  }

  const formatTypeName = () => {
    switch (meta.type) {
      case 'markdown':
        return 'Markdown Document (.md)'
      case 'plain':
        return 'Plain Text Document (.txt)'
      case 'rich':
      default:
        return 'Rich Text Document'
    }
  }

  return (
    <div
      className="doc-properties-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-properties-title"
    >
      <div
        className="doc-properties-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="doc-properties-header">
          <div className="doc-properties-header-info">
            {getTypeIcon()}
            <div>
              <h2 id="doc-properties-title" className="doc-properties-title">
                {meta.title}
              </h2>
              <span className="doc-properties-subtitle">{formatTypeName()}</span>
            </div>
          </div>
          <button
            id="doc-properties-btn-close"
            type="button"
            className="doc-properties-close-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="doc-properties-body">
          {loading ? (
            <div className="doc-properties-loading">Loading properties…</div>
          ) : (
            <div className="doc-properties-grid">
              {/* Location */}
              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Folder size={14} /> Location
                </span>
                <span className="doc-properties-val">{folderName}</span>
              </div>

              {/* Statistics */}
              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Type size={14} /> Word Count
                </span>
                <span className="doc-properties-val">
                  {meta.wordCount.toLocaleString()} {meta.wordCount === 1 ? 'word' : 'words'}
                </span>
              </div>

              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Type size={14} /> Character Count
                </span>
                <span className="doc-properties-val">
                  {meta.characterCount.toLocaleString()} characters
                </span>
              </div>

              {/* Storage */}
              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <HardDrive size={14} /> Document Size
                </span>
                <span className="doc-properties-val">
                  {formatBytes(contentSizeBytes)}
                </span>
              </div>

              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Paperclip size={14} /> Attachments
                </span>
                <span className="doc-properties-val">
                  {attachments.length}{' '}
                  {attachments.length > 0 && `(${formatBytes(totalAttachmentBytes)})`}
                </span>
              </div>

              <div className="doc-properties-row doc-properties-row--highlight">
                <span className="doc-properties-label">
                  <HardDrive size={14} /> Total Storage
                </span>
                <span className="doc-properties-val doc-properties-val--bold">
                  {formatBytes(totalSizeBytes)}
                </span>
              </div>

              <div className="doc-properties-divider" />

              {/* Timestamps */}
              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Calendar size={14} /> Created
                </span>
                <span className="doc-properties-val">{formatDate(meta.createdAt)}</span>
              </div>

              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Clock size={14} /> Last Modified
                </span>
                <span className="doc-properties-val">{formatDate(meta.updatedAt)}</span>
              </div>

              <div className="doc-properties-row">
                <span className="doc-properties-label">
                  <Clock size={14} /> Last Opened
                </span>
                <span className="doc-properties-val">{formatDate(meta.lastOpenedAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="doc-properties-footer">
          <button
            id="doc-properties-btn-ok"
            type="button"
            className="doc-properties-ok-btn"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
