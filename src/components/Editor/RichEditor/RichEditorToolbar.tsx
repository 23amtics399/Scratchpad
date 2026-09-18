import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Undo,
  Redo,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Code2,
  Quote,
  Minus,
  Info,
  Sliders,
  Search,
  RemoveFormatting,
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  X,
} from 'lucide-react'
import { overlayManager } from '@/utils/overlayManager.js'
import './RichEditorToolbar.css'

// Preset color options
const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Dark Slate', value: '#1e293b' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
]

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
]

interface ToolbarState {
  canUndo: boolean
  canRedo: boolean
  fontFamily: string
  isMixedFont: boolean
  fontSize: string
  isMixedSize: boolean
  headingLevel: string
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrike: boolean
  isSuperscript: boolean
  isSubscript: boolean
  isCode: boolean
  textAlign: string
  isBulletList: boolean
  isOrderedList: boolean
  isTaskList: boolean
  isBlockquote: boolean
  isCodeBlock: boolean
  textColor: string
  highlightColor: string
  lineHeight: string
  letterSpacing: string
  paragraphSpacing: string
}

function getInitialToolbarState(): ToolbarState {
  return {
    canUndo: false,
    canRedo: false,
    fontFamily: '',
    isMixedFont: false,
    fontSize: '',
    isMixedSize: false,
    headingLevel: 'p',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isSuperscript: false,
    isSubscript: false,
    isCode: false,
    textAlign: 'left',
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    isBlockquote: false,
    isCodeBlock: false,
    textColor: '',
    highlightColor: '',
    lineHeight: '',
    letterSpacing: '',
    paragraphSpacing: '',
  }
}

function computeToolbarState(editor: Editor | null): ToolbarState {
  if (!editor || editor.isDestroyed) {
    return getInitialToolbarState()
  }

  const { state } = editor
  const { selection } = state
  const { from, to, empty } = selection

  let fontFamily = ''
  let isMixedFont = false
  let fontSize = ''
  let isMixedSize = false

  if (empty) {
    const textAttrs = editor.getAttributes('textStyle')
    fontFamily = textAttrs.fontFamily || ''
    fontSize = textAttrs.fontSize || ''
  } else {
    let firstFont: string | null = null
    let firstSize: string | null = null

    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        const textMark = node.marks.find((m) => m.type.name === 'textStyle')
        const nodeFont = textMark?.attrs?.fontFamily || ''
        const nodeSize = textMark?.attrs?.fontSize || ''

        if (firstFont === null) {
          firstFont = nodeFont
        } else if (firstFont !== nodeFont) {
          isMixedFont = true
        }

        if (firstSize === null) {
          firstSize = nodeSize
        } else if (firstSize !== nodeSize) {
          isMixedSize = true
        }
      }
      return true
    })

    fontFamily = isMixedFont ? '__mixed__' : (firstFont || '')
    fontSize = isMixedSize ? '__mixed__' : (firstSize || '')
  }

  // Heading Level
  let headingLevel = 'p'
  for (let l = 1; l <= 6; l++) {
    if (editor.isActive('heading', { level: l })) {
      headingLevel = `h${l}`
      break
    }
  }

  // Alignment
  let textAlign = 'left'
  if (editor.isActive({ textAlign: 'center' })) textAlign = 'center'
  else if (editor.isActive({ textAlign: 'right' })) textAlign = 'right'
  else if (editor.isActive({ textAlign: 'justify' })) textAlign = 'justify'

  const textStyleAttrs = editor.getAttributes('textStyle')
  const paragraphAttrs = editor.getAttributes('paragraph')

  return {
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    fontFamily,
    isMixedFont,
    fontSize,
    isMixedSize,
    headingLevel,
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isUnderline: editor.isActive('underline'),
    isStrike: editor.isActive('strike'),
    isSuperscript: editor.isActive('superscript'),
    isSubscript: editor.isActive('subscript'),
    isCode: editor.isActive('code'),
    textAlign,
    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    isTaskList: editor.isActive('taskList'),
    isBlockquote: editor.isActive('blockquote'),
    isCodeBlock: editor.isActive('codeBlock'),
    textColor: textStyleAttrs.color || '',
    highlightColor: editor.getAttributes('highlight').color || '',
    lineHeight: paragraphAttrs.lineHeight || '',
    letterSpacing: textStyleAttrs.letterSpacing || '',
    paragraphSpacing: paragraphAttrs.paragraphSpacing || '',
  }
}

interface RichEditorToolbarProps {
  editor: Editor | null
  onOpenFindReplace: () => void
  isFindReplaceOpen: boolean
  onInsertImageFile: (file: File) => void
}

export function RichEditorToolbar({
  editor,
  onOpenFindReplace,
  isFindReplaceOpen,
  onInsertImageFile,
}: RichEditorToolbarProps) {
  const [state, setState] = useState<ToolbarState>(() => computeToolbarState(editor))
  const [moreOpen, setMoreOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  // Isolated subscription to editor selection & transaction events
  // Re-renders ONLY the toolbar, preventing heavy re-renders of the document content tree!
  useEffect(() => {
    if (!editor) return

    const updateState = () => {
      setState(computeToolbarState(editor))
    }

    editor.on('selectionUpdate', updateState)
    editor.on('transaction', updateState)

    return () => {
      editor.off('selectionUpdate', updateState)
      editor.off('transaction', updateState)
    }
  }, [editor])

  const closeMoreFormatting = useCallback((restoreFocus = false) => {
    setMoreOpen(false)
    overlayManager.close('more-formatting')
    if (restoreFocus) {
      requestAnimationFrame(() => {
        moreBtnRef.current?.focus()
      })
    }
  }, [])

  // Close popover on click outside, Escape, viewport resize, or incompatible overlay opening
  useEffect(() => {
    if (!moreOpen) return

    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
        closeMoreFormatting(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeMoreFormatting(true)
      }
    }

    const handleClose = () => closeMoreFormatting(false)
    const handleCloseOverlays = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptId?: string }>
      if (customEvent.detail?.exceptId !== 'more-formatting') {
        closeMoreFormatting(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleClose)
    window.addEventListener('scratchpad:viewport-resize', handleClose)
    window.addEventListener('scratchpad:close-overlays', handleCloseOverlays)

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleClose)
      window.removeEventListener('scratchpad:viewport-resize', handleClose)
      window.removeEventListener('scratchpad:close-overlays', handleCloseOverlays)
    }
  }, [moreOpen, closeMoreFormatting])

  const handleLink = useCallback(() => {
    if (!editor) return
    const prevUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter URL:', prevUrl)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    }
  }, [editor])

  const handleCallout = useCallback(() => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '💡 Note: Add your callout text here…' }],
          },
        ],
      })
      .run()
  }, [editor])

  if (!editor) return null

  // Normalize font family matching
  const activeFontValue = state.isMixedFont
    ? '__mixed__'
    : state.fontFamily
    ? state.fontFamily.includes('JetBrains Mono')
      ? "'JetBrains Mono', monospace"
      : state.fontFamily.includes('Georgia')
      ? 'Georgia, serif'
      : state.fontFamily.includes('Arial')
      ? 'Arial, sans-serif'
      : state.fontFamily.includes('Courier')
      ? "'Courier New', monospace"
      : state.fontFamily.includes('Inter')
      ? 'Inter, system-ui, sans-serif'
      : state.fontFamily
    : ''

  const activeSizeValue = state.isMixedSize ? '__mixed__' : state.fontSize

  return (
    <div className="rich-editor-toolbar" role="toolbar" aria-label="Editor formatting toolbar">
      {/* 1. History: Undo & Redo (Always visible) */}
      <div className="rich-editor-toolbar-group toolbar-group--history">
        <button
          type="button"
          className="toolbar-btn"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo size={14} />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* 2. Font Family & Font Size */}
      <div className="rich-editor-toolbar-group toolbar-group--font">
        <select
          className="toolbar-select toolbar-select--font"
          value={activeFontValue}
          onChange={(e) => {
            const val = e.target.value
            if (val === '__mixed__') return
            if (!val) {
              editor.chain().focus().unsetFontFamily().run()
            } else {
              editor.chain().focus().setFontFamily(val).run()
            }
          }}
          title="Font Family"
          aria-label="Font Family"
        >
          {state.isMixedFont && <option value="__mixed__">Mixed Fonts</option>}
          <option value="">Default</option>
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          <option value="Georgia, serif">Georgia (Serif)</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>

        <select
          className="toolbar-select toolbar-select--size"
          value={activeSizeValue}
          onChange={(e) => {
            const val = e.target.value
            if (val === '__mixed__') return
            if (!val) {
              editor.chain().focus().unsetFontSize().run()
            } else {
              editor.chain().focus().setFontSize(val).run()
            }
          }}
          title="Font Size"
          aria-label="Font Size"
        >
          {state.isMixedSize && <option value="__mixed__">Mixed Sizes</option>}
          <option value="">16px</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
        </select>
      </div>

      <div className="toolbar-sep" />

      {/* 3. Block Type / Heading Selector (Always visible) */}
      <div className="rich-editor-toolbar-group toolbar-group--heading">
        <select
          className="toolbar-select toolbar-select--heading"
          value={state.headingLevel}
          onChange={(e) => {
            const val = e.target.value
            if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run()
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run()
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run()
            else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run()
            else if (val === 'h5') editor.chain().focus().toggleHeading({ level: 5 }).run()
            else if (val === 'h6') editor.chain().focus().toggleHeading({ level: 6 }).run()
            else editor.chain().focus().setParagraph().run()
          }}
          title="Paragraph or Heading"
          aria-label="Heading Level"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
        </select>
      </div>

      <div className="toolbar-sep" />

      {/* 4. Common Inline: Bold, Italic, Underline, Strike */}
      <div className="rich-editor-toolbar-group toolbar-group--inline-basic">
        <button
          type="button"
          className={`toolbar-btn ${state.isBold ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <BoldIcon size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isItalic ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <ItalicIcon size={14} />
        </button>
      </div>

      <div className="rich-editor-toolbar-group toolbar-group--inline-extra">
        <button
          type="button"
          className={`toolbar-btn ${state.isUnderline ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isStrike ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
      </div>

      <div className="toolbar-sep toolbar-sep--align" />

      {/* 5. Alignment: Left, Center, Right, Justify */}
      <div className="rich-editor-toolbar-group toolbar-group--align">
        <button
          type="button"
          className={`toolbar-btn ${state.textAlign === 'left' ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.textAlign === 'center' ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.textAlign === 'right' ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.textAlign === 'justify' ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
          aria-label="Justify"
        >
          <AlignJustify size={14} />
        </button>
      </div>

      <div className="toolbar-sep toolbar-sep--lists" />

      {/* 6. Lists: Bullet, Numbered, Checklist */}
      <div className="rich-editor-toolbar-group toolbar-group--lists">
        <button
          type="button"
          className={`toolbar-btn ${state.isBulletList ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isOrderedList ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isTaskList ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Task Checklist"
          aria-label="Task Checklist"
        >
          <CheckSquare size={14} />
        </button>
      </div>

      <div className="toolbar-sep toolbar-sep--insert" />

      {/* 7. Grouped Insert Actions: Link, Image, Table, Code, Quote, Divider, Callout */}
      <div className="rich-editor-toolbar-group toolbar-group--insert">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          onClick={handleLink}
          title="Insert / Edit Link"
          aria-label="Insert Link"
        >
          <Link2 size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = () => {
              const file = input.files?.[0]
              if (file) onInsertImageFile(file)
            }
            input.click()
          }}
          title="Insert Image"
          aria-label="Insert Image"
        >
          <ImageIcon size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert Table (3x3)"
          aria-label="Insert Table"
        >
          <TableIcon size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isCodeBlock ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
          aria-label="Code Block"
        >
          <Code2 size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${state.isBlockquote ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote Block"
          aria-label="Quote Block"
        >
          <Quote size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Divider"
          aria-label="Horizontal Divider"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleCallout}
          title="Insert Callout Note"
          aria-label="Insert Callout"
        >
          <Info size={14} />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* 8. Advanced Formatting Popover Trigger */}
      <div className="rich-editor-toolbar-group toolbar-group--more" style={{ position: 'relative' }}>
        <button
          ref={moreBtnRef}
          type="button"
          id="toolbar-more-btn"
          className={`toolbar-btn ${moreOpen ? 'is-active' : ''}`}
          onClick={() => {
            if (moreOpen) {
              closeMoreFormatting(false)
            } else {
              setMoreOpen(true)
              overlayManager.open('more-formatting')
            }
          }}
          title="More Formatting (Color, Spacing, Script, Indent)"
          aria-label="More Formatting"
          aria-expanded={moreOpen}
        >
          <Sliders size={14} />
        </button>

        {/* Professional Desktop-Styled Formatting Popover */}
        {moreOpen && (
          <div
            ref={popoverRef}
            id="more-formatting-popover"
            className="more-formatting-popover"
            role="dialog"
            aria-modal="false"
            aria-label="More Formatting"
          >
            {/* Popover Header with Title and Close Button */}
            <div className="popover-header">
              <span className="popover-title">More Formatting</span>
              <button
                type="button"
                id="more-formatting-close-btn"
                className="popover-close-btn"
                onClick={() => closeMoreFormatting(true)}
                title="Close more formatting"
                aria-label="Close formatting panel"
              >
                <X size={14} />
              </button>
            </div>

            <div className="popover-body">
              {/* Responsive Fallback: Font & Size on Compact Viewports */}
              <div className="popover-section popover-section--compact-font">
                <div className="popover-section-title">Typography</div>
                <div className="popover-select-row">
                  <select
                    className="toolbar-select toolbar-select--font"
                    value={activeFontValue}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__mixed__') return
                      if (!val) {
                        editor.chain().focus().unsetFontFamily().run()
                      } else {
                        editor.chain().focus().setFontFamily(val).run()
                      }
                    }}
                    title="Font Family"
                    aria-label="Font Family"
                  >
                    {state.isMixedFont && <option value="__mixed__">Mixed Fonts</option>}
                    <option value="">Default</option>
                    <option value="Inter, system-ui, sans-serif">Inter</option>
                    <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>

                  <select
                    className="toolbar-select toolbar-select--size"
                    value={activeSizeValue}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__mixed__') return
                      if (!val) {
                        editor.chain().focus().unsetFontSize().run()
                      } else {
                        editor.chain().focus().setFontSize(val).run()
                      }
                    }}
                    title="Font Size"
                    aria-label="Font Size"
                  >
                    {state.isMixedSize && <option value="__mixed__">Mixed Sizes</option>}
                    <option value="">16px</option>
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                    <option value="24px">24px</option>
                    <option value="28px">28px</option>
                    <option value="32px">32px</option>
                    <option value="36px">36px</option>
                    <option value="48px">48px</option>
                  </select>
                </div>
              </div>

              {/* Responsive Fallback: Insert Actions */}
              <div className="popover-section popover-section--compact-insert">
                <div className="popover-section-title">Insert Content</div>
                <div className="popover-btn-group popover-btn-group--grid">
                  <button
                    type="button"
                    className={`popover-btn ${editor.isActive('link') ? 'is-active' : ''}`}
                    onClick={() => {
                      setMoreOpen(false)
                      handleLink()
                    }}
                    title="Insert Link"
                  >
                    <Link2 size={13} />
                    <span>Link</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => {
                      setMoreOpen(false)
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = () => {
                        const file = input.files?.[0]
                        if (file) onInsertImageFile(file)
                      }
                      input.click()
                    }}
                    title="Insert Image"
                  >
                    <ImageIcon size={13} />
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                      setMoreOpen(false)
                    }}
                    title="Insert Table"
                  >
                    <TableIcon size={13} />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isCodeBlock ? 'is-active' : ''}`}
                    onClick={() => {
                      editor.chain().focus().toggleCodeBlock().run()
                      setMoreOpen(false)
                    }}
                    title="Code Block"
                  >
                    <Code2 size={13} />
                    <span>Code Block</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isBlockquote ? 'is-active' : ''}`}
                    onClick={() => {
                      editor.chain().focus().toggleBlockquote().run()
                      setMoreOpen(false)
                    }}
                    title="Quote Block"
                  >
                    <Quote size={13} />
                    <span>Quote</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => {
                      editor.chain().focus().setHorizontalRule().run()
                      setMoreOpen(false)
                    }}
                    title="Divider"
                  >
                    <Minus size={13} />
                    <span>Divider</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => {
                      handleCallout()
                      setMoreOpen(false)
                    }}
                    title="Callout Note"
                  >
                    <Info size={13} />
                    <span>Callout</span>
                  </button>
                </div>
              </div>

              {/* Responsive Fallback: Alignment */}
              <div className="popover-section popover-section--compact-align">
                <div className="popover-section-title">Alignment</div>
                <div className="popover-btn-group popover-btn-group--grid">
                  <button
                    type="button"
                    className={`popover-btn ${state.textAlign === 'left' ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    title="Align Left"
                  >
                    <AlignLeft size={13} />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.textAlign === 'center' ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    title="Align Center"
                  >
                    <AlignCenter size={13} />
                    <span>Center</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.textAlign === 'right' ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    title="Align Right"
                  >
                    <AlignRight size={13} />
                    <span>Right</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.textAlign === 'justify' ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    title="Justify"
                  >
                    <AlignJustify size={13} />
                    <span>Justify</span>
                  </button>
                </div>
              </div>

              {/* Responsive Fallback: Lists */}
              <div className="popover-section popover-section--compact-lists">
                <div className="popover-section-title">Lists</div>
                <div className="popover-btn-group popover-btn-group--grid">
                  <button
                    type="button"
                    className={`popover-btn ${state.isBulletList ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet List"
                  >
                    <List size={13} />
                    <span>Bullet</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isOrderedList ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Numbered List"
                  >
                    <ListOrdered size={13} />
                    <span>Numbered</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isTaskList ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    title="Task Checklist"
                  >
                    <CheckSquare size={13} />
                    <span>Checklist</span>
                  </button>
                </div>
              </div>

              {/* Text & Highlight Color */}
              <div className="popover-section">
                <div className="popover-section-title">Colors</div>
                <div className="popover-color-row">
                  <span className="popover-row-label">Text:</span>
                  <div className="color-swatches">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        className={`color-swatch-btn ${state.textColor === c.value ? 'is-active' : ''}`}
                        style={{ backgroundColor: c.value || 'var(--sp-color-fg)' }}
                        title={c.label}
                        onClick={() => {
                          if (!c.value) editor.chain().focus().unsetColor().run()
                          else editor.chain().focus().setColor(c.value).run()
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={state.textColor || '#000000'}
                      onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                      className="color-input-native"
                      title="Custom text color"
                    />
                  </div>
                </div>

                <div className="popover-color-row">
                  <span className="popover-row-label">Highlight:</span>
                  <div className="color-swatches">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        className={`color-swatch-btn ${state.highlightColor === c.value ? 'is-active' : ''}`}
                        style={{
                          backgroundColor: c.value || 'transparent',
                          border: !c.value ? '1px dashed var(--sp-color-border-strong)' : undefined,
                        }}
                        title={c.label}
                        onClick={() => {
                          if (!c.value) editor.chain().focus().unsetHighlight().run()
                          else editor.chain().focus().toggleHighlight({ color: c.value }).run()
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Script & Indent */}
              <div className="popover-section">
                <div className="popover-section-title">Character & Indentation</div>
                <div className="popover-btn-group">
                  <button
                    type="button"
                    className={`popover-btn popover-btn--compact-inline ${state.isUnderline ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline (Ctrl+U)"
                  >
                    <UnderlineIcon size={13} />
                    <span>Underline</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn popover-btn--compact-inline ${state.isStrike ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Strikethrough"
                  >
                    <Strikethrough size={13} />
                    <span>Strike</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isSuperscript ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    title="Superscript"
                  >
                    <span>X² Superscript</span>
                  </button>
                  <button
                    type="button"
                    className={`popover-btn ${state.isSubscript ? 'is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    title="Subscript"
                  >
                    <span>X₂ Subscript</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => editor.chain().focus().outdent().run()}
                    title="Outdent (Shift+Tab)"
                  >
                    <OutdentIcon size={13} />
                    <span>Outdent</span>
                  </button>
                  <button
                    type="button"
                    className="popover-btn"
                    onClick={() => editor.chain().focus().indent().run()}
                    title="Indent (Tab)"
                  >
                    <IndentIcon size={13} />
                    <span>Indent</span>
                  </button>
                </div>
              </div>

              {/* Spacing: Line Height, Letter Spacing, Paragraph Spacing */}
              <div className="popover-section">
                <div className="popover-section-title">Line & Paragraph Spacing</div>
                <div className="spacing-group">
                  <span className="spacing-label">Line Height:</span>
                  <div className="spacing-chips">
                    {['1.0', '1.15', '1.25', '1.5', '1.75', '2.0'].map((lh) => (
                      <button
                        key={lh}
                        type="button"
                        className={`chip-btn ${state.lineHeight === lh ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().setLineHeight(lh).run()}
                      >
                        {lh}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chip-btn chip-btn--reset"
                      onClick={() => editor.chain().focus().unsetLineHeight().run()}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="spacing-group">
                  <span className="spacing-label">Letter Spacing:</span>
                  <div className="spacing-chips">
                    {['0px', '0.5px', '1px', '2px'].map((ls) => (
                      <button
                        key={ls}
                        type="button"
                        className={`chip-btn ${state.letterSpacing === ls ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().setLetterSpacing(ls).run()}
                      >
                        {ls}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chip-btn chip-btn--reset"
                      onClick={() => editor.chain().focus().unsetLetterSpacing().run()}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="spacing-group">
                  <span className="spacing-label">Paragraph Spacing:</span>
                  <div className="spacing-chips">
                    {[
                      { label: 'Compact', val: '0.3em' },
                      { label: 'Normal', val: '0.8em' },
                      { label: 'Relaxed', val: '1.4em' },
                    ].map((ps) => (
                      <button
                        key={ps.label}
                        type="button"
                        className={`chip-btn ${state.paragraphSpacing === ps.val ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().setParagraphSpacing(ps.val).run()}
                      >
                        {ps.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chip-btn chip-btn--reset"
                      onClick={() => editor.chain().focus().unsetParagraphSpacing().run()}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="popover-section popover-section--actions">
                <button
                  type="button"
                  className="popover-find-btn popover-find-btn--compact"
                  onClick={() => {
                    closeMoreFormatting(false)
                    onOpenFindReplace()
                  }}
                  title="Find & Replace in Document"
                >
                  <Search size={13} />
                  <span>Find & Replace (Ctrl+F)</span>
                </button>
              </div>
            </div>

            {/* Sticky Footer: Clear All Formatting */}
            <div className="popover-footer">
              <button
                type="button"
                id="toolbar-clear-formatting-btn"
                className="popover-clear-btn"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .unsetAllMarks()
                    .clearNodes()
                    .setParagraph()
                    .setTextAlign('left')
                    .run()
                  closeMoreFormatting(true)
                }}
                title="Clear all formatting from selection"
                aria-label="Clear All Formatting"
              >
                <RemoveFormatting size={14} />
                <span>Clear All Formatting</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-sep toolbar-sep--find" />

      {/* 9. Find & Replace In Document Toggle */}
      <div className="rich-editor-toolbar-group toolbar-group--find">
        <button
          type="button"
          id="toolbar-find-btn"
          className={`toolbar-btn ${isFindReplaceOpen ? 'is-active' : ''}`}
          onClick={onOpenFindReplace}
          title="Find & Replace in Document (Ctrl+F)"
          aria-label="Find and Replace"
        >
          <Search size={14} />
        </button>
      </div>
    </div>
  )
}
