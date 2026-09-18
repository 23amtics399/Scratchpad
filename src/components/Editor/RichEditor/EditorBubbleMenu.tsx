import { useState, useEffect } from 'react'
import { BubbleMenu as TiptapBubbleMenu, type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { overlayManager } from '@/utils/overlayManager.js'
import './EditorBubbleMenu.css'

interface EditorBubbleMenuProps {
  editor: Editor | null
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    const handleClose = () => {
      setShowLinkInput(false)
      setLinkUrl('')
    }
    const handleCloseOverlays = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptId?: string }>
      if (customEvent.detail?.exceptId !== 'bubble-menu') {
        handleClose()
      }
    }
    window.addEventListener('resize', handleClose)
    window.addEventListener('scratchpad:viewport-resize', handleClose)
    window.addEventListener('scratchpad:close-overlays', handleCloseOverlays)
    return () => {
      window.removeEventListener('resize', handleClose)
      window.removeEventListener('scratchpad:viewport-resize', handleClose)
      window.removeEventListener('scratchpad:close-overlays', handleCloseOverlays)
    }
  }, [])

  if (!editor || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')) {
    return null
  }

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const openLinkPrompt = () => {
    const previousUrl = editor.getAttributes('link').href || ''
    setLinkUrl(previousUrl)
    setShowLinkInput(true)
    overlayManager.open('bubble-menu')
  }

  return (
    <TiptapBubbleMenu
      editor={editor}
      shouldShow={({ editor }) => !editor.isActive('table')}
      tippyOptions={{ duration: 150, placement: 'top-start' }}
      className="editor-bubble-menu"
    >
      {showLinkInput ? (
        <form onSubmit={handleLinkSubmit} className="bubble-menu-link-form" role="dialog" aria-label="Insert link">
          <input
            type="url"
            placeholder="Paste or type link URL…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="bubble-menu-link-input"
            autoFocus
          />
          <div className="bubble-menu-link-actions">
            <button type="submit" className="bubble-menu-link-btn bubble-menu-link-btn--apply">
              Apply
            </button>
            <button
              type="button"
              className="bubble-menu-link-btn bubble-menu-link-btn--cancel"
              onClick={() => {
                setShowLinkInput(false)
                setLinkUrl('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bubble-menu-actions">
          {/* Headings */}
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 size={14} />
          </button>

          <div className="bubble-menu-sep" />

          {/* Formats */}
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('superscript') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            title="Superscript"
          >
            <span style={{ fontSize: '11px', fontWeight: 600 }}>X²</span>
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('subscript') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            title="Subscript"
          >
            <span style={{ fontSize: '11px', fontWeight: 600 }}>X₂</span>
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('code') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight Text"
          >
            <Highlighter size={14} />
          </button>

          <div className="bubble-menu-sep" />

          {/* Link */}
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive('link') ? 'is-active' : ''}`}
            onClick={openLinkPrompt}
            title="Insert / Edit Link"
          >
            <Link2 size={14} />
          </button>

          <div className="bubble-menu-sep" />

          {/* Alignment */}
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            className={`bubble-menu-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>
        </div>
      )}
    </TiptapBubbleMenu>
  )
}
