import { useMemo, useState, useEffect } from 'react'
import { Hash, X, FileText, AlignLeft } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import { documentService } from '@/services/DocumentService.js'
import type { DocumentRecord } from '@/types/index.js'
import './OutlinePanel.css'

export interface OutlineItem {
  id: string
  text: string
  level: number
  lineIndex?: number
  headingIndex: number
}

interface OutlinePanelProps {
  documentId: string
}

export function OutlinePanel({ documentId }: OutlinePanelProps) {
  const { toggleOutline } = useUI()
  const { documents } = useWorkspace()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number | null>(null)

  // Load document and listen for live updates
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const d = await documentService.getById(documentId)
        if (active) setDoc(d || null)
      } catch {
        if (active) setDoc(null)
      }
    }
    load()

    // Listen for live editor content change event
    const handleContentUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ documentId: string; content: string }>
      if (ce.detail?.documentId === documentId) {
        setDoc((prev) => (prev ? { ...prev, content: ce.detail.content } : null))
      }
    }

    window.addEventListener('scratchpad:content-change', handleContentUpdate)
    return () => {
      active = false
      window.removeEventListener('scratchpad:content-change', handleContentUpdate)
    }
  }, [documentId, documents])

  // Extract headings based on document type
  const items = useMemo<OutlineItem[]>(() => {
    if (!doc || !doc.content) return []

    if (doc.type === 'plain') {
      return []
    }

    if (doc.type === 'markdown') {
      const lines = doc.content.split('\n')
      const result: OutlineItem[] = []
      let headingIndex = 0

      lines.forEach((line, idx) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (match) {
          result.push({
            id: `md-heading-${idx}`,
            text: match[2].trim(),
            level: match[1].length,
            lineIndex: idx,
            headingIndex: headingIndex++,
          })
        }
      })
      return result
    }

    // Rich Text (Tiptap JSON)
    if (doc.type === 'rich') {
      try {
        const parsed = JSON.parse(doc.content)
        const result: OutlineItem[] = []
        let headingIndex = 0

        const extractHeadings = (node: Record<string, unknown>) => {
          if (node.type === 'heading') {
            const level = typeof node.attrs === 'object' && node.attrs && 'level' in node.attrs
              ? Number(node.attrs.level) || 1
              : 1

            let text = ''
            if (Array.isArray(node.content)) {
              text = node.content
                .filter((c) => typeof c.text === 'string')
                .map((c) => c.text)
                .join('')
            }

            result.push({
              id: `rich-heading-${headingIndex}`,
              text: text.trim() || 'Untitled section',
              level,
              headingIndex: headingIndex++,
            })
          }

          if (Array.isArray(node.content)) {
            for (const child of node.content) {
              extractHeadings(child as Record<string, unknown>)
            }
          }
        }

        extractHeadings(parsed)
        return result
      } catch {
        return []
      }
    }

    return []
  }, [doc])

  const handleItemClick = (item: OutlineItem) => {
    setActiveHeadingIndex(item.headingIndex)

    if (doc?.type === 'markdown') {
      // Dispatch navigation event for CodeMirror
      window.dispatchEvent(
        new CustomEvent('scratchpad:navigate-markdown-line', {
          detail: { line: item.lineIndex },
        })
      )
    } else if (doc?.type === 'rich') {
      // Find heading elements in editor DOM
      const headings = document.querySelectorAll(
        '.tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6'
      )
      const target = headings[item.headingIndex]
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <aside
      id="scratchpad-outline-panel"
      className="outline-panel"
      aria-label="Document outline"
    >
      <div className="outline-panel__header">
        <div className="outline-panel__title-group">
          <AlignLeft size={14} className="outline-panel__icon" />
          <span className="outline-panel__title">Outline</span>
          {items.length > 0 && (
            <span className="outline-panel__badge">{items.length}</span>
          )}
        </div>
        <button
          id="outline-btn-close"
          type="button"
          className="outline-panel__close-btn"
          onClick={toggleOutline}
          title="Close outline"
          aria-label="Close outline"
        >
          <X size={14} />
        </button>
      </div>

      <div className="outline-panel__content">
        {doc?.type === 'plain' ? (
          <div className="outline-panel__empty">
            <FileText size={28} className="outline-panel__empty-icon" />
            <p className="outline-panel__empty-title">No outline available</p>
            <span className="outline-panel__empty-desc">
              Outlines are generated from headings in Rich Text and Markdown documents.
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="outline-panel__empty">
            <Hash size={28} className="outline-panel__empty-icon" />
            <p className="outline-panel__empty-title">No headings found</p>
            <span className="outline-panel__empty-desc">
              Add headings (H1–H6) to build an interactive outline.
            </span>
          </div>
        ) : (
          <nav className="outline-panel__list" aria-label="Headings">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`outline-panel__item outline-panel__item--level-${item.level} ${
                  activeHeadingIndex === item.headingIndex ? 'is-active' : ''
                }`}
                style={{ paddingLeft: `${12 + (item.level - 1) * 12}px` }}
                onClick={() => handleItemClick(item)}
                title={`H${item.level}: ${item.text}`}
              >
                <span className="outline-panel__level-tag">H{item.level}</span>
                <span className="outline-panel__item-text">{item.text}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  )
}
