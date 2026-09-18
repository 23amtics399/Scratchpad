import { useEffect, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2 } from 'lucide-react'
import { attachmentService } from '@/services/AttachmentService.js'
import './ImageComponent.css'

export function ImageComponent({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const attachmentId = node.attrs.attachmentId as string | undefined
  const src = node.attrs.src as string | undefined
  const alt = (node.attrs.alt as string) || ''
  const caption = (node.attrs.caption as string) || ''
  const alignment = (node.attrs.alignment as 'left' | 'center' | 'right' | 'full') || 'center'
  const width = (node.attrs.width as string) || 'auto'

  useEffect(() => {
    let active = true

    const loadUrl = async () => {
      if (attachmentId) {
        // Try sync cache first
        const cached = attachmentService.resolveSync(attachmentId)
        if (cached) {
          if (active) {
            setResolvedSrc(cached)
            setLoading(false)
          }
          return
        }

        // Async resolve
        setLoading(true)
        const url = await attachmentService.resolve(attachmentId)
        if (active) {
          if (url) {
            setResolvedSrc(url)
          } else if (src) {
            setResolvedSrc(src)
          }
          setLoading(false)
        }
      } else if (src) {
        if (active) {
          setResolvedSrc(src)
          setLoading(false)
        }
      }
    }

    loadUrl()

    return () => {
      active = false
      if (attachmentId) {
        attachmentService.release(attachmentId)
      }
    }
  }, [attachmentId, src])

  const setAlign = (align: 'left' | 'center' | 'right' | 'full') => {
    updateAttributes({ alignment: align })
  }

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ caption: e.target.value })
  }

  return (
    <NodeViewWrapper
      className={`editor-image-wrapper editor-image-wrapper--${alignment} ${selected ? 'editor-image-wrapper--selected' : ''}`}
      contentEditable={false}
    >
      <div className="editor-image-container">
        {loading ? (
          <div className="editor-image-placeholder">Loading attachment…</div>
        ) : (
          <img
            src={resolvedSrc || src}
            alt={alt}
            style={{ width: alignment === 'full' ? '100%' : width }}
            className="editor-image"
          />
        )}

        {/* Toolbar on hover or selection */}
        <div className="editor-image-toolbar">
          <button
            type="button"
            className={`editor-image-btn ${alignment === 'left' ? 'editor-image-btn--active' : ''}`}
            onClick={() => setAlign('left')}
            title="Align Left"
            aria-label="Align image left"
          >
            <AlignLeft size={13} />
          </button>
          <button
            type="button"
            className={`editor-image-btn ${alignment === 'center' ? 'editor-image-btn--active' : ''}`}
            onClick={() => setAlign('center')}
            title="Align Center"
            aria-label="Align image center"
          >
            <AlignCenter size={13} />
          </button>
          <button
            type="button"
            className={`editor-image-btn ${alignment === 'right' ? 'editor-image-btn--active' : ''}`}
            onClick={() => setAlign('right')}
            title="Align Right"
            aria-label="Align image right"
          >
            <AlignRight size={13} />
          </button>
          <button
            type="button"
            className={`editor-image-btn ${alignment === 'full' ? 'editor-image-btn--active' : ''}`}
            onClick={() => setAlign('full')}
            title="Full Width"
            aria-label="Make image full width"
          >
            <Maximize2 size={13} />
          </button>
          <div className="editor-image-btn-sep" />
          <button
            type="button"
            className="editor-image-btn editor-image-btn--danger"
            onClick={deleteNode}
            title="Delete Image"
            aria-label="Delete image"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Caption */}
        <div className="editor-image-caption">
          <input
            type="text"
            placeholder="Add a caption…"
            value={caption}
            onChange={handleCaptionChange}
            className="editor-image-caption-input"
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}
