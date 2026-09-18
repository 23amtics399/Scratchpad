import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import HardBreak from '@tiptap/extension-hard-break'
import Table from '@tiptap/extension-table'
import { CustomTableRow, CustomTableHeader, CustomTableCell } from './extensions/TableExtensions.js'
import { TableRowResizer } from './extensions/TableRowResizer.js'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import History from '@tiptap/extension-history'
import Typography from '@tiptap/extension-typography'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'

import { lowlight } from './lowlightSetup.js'
import { CodeBlockComponent } from './CodeBlockComponent.js'
import { ImageComponent } from './ImageComponent.js'
import { EditorBubbleMenu } from './EditorBubbleMenu.js'
import { TableToolbar } from './TableToolbar.js'
import { SlashCommands } from './SlashCommands.js'
import { RichEditorToolbar } from './RichEditorToolbar.js'
import { FontSize } from './extensions/FontSize.js'
import { Indent } from './extensions/Indent.js'
import { FormattingStyles } from './extensions/FormattingStyles.js'
import { TableActiveFeedback } from './extensions/TableActiveFeedback.js'
import { FindReplaceBar } from '../FindReplaceBar.js'
import { attachmentService } from '@/services/AttachmentService.js'
import { useSettings } from '@/contexts/SettingsContext.js'
import './RichEditor.css'

// -----------------------------------------------------------------------------
// Custom Node Extensions
// -----------------------------------------------------------------------------

// Custom CodeBlockLowlight with NodeView
const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'javascript',
      },
      showLineNumbers: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-line-numbers') === 'true',
        renderHTML: (attributes) => ({ 'data-line-numbers': attributes.showLineNumbers }),
      },
      wordWrap: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-word-wrap') === 'true',
        renderHTML: (attributes) => ({ 'data-word-wrap': attributes.wordWrap }),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent)
  },
})

// Custom Image with NodeView and AttachmentService reference
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-attachment-id'),
        renderHTML: (attributes) => ({ 'data-attachment-id': attributes.attachmentId }),
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes) => ({ 'data-alignment': attributes.alignment }),
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes) => ({ 'data-caption': attributes.caption }),
      },
      width: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('width') || 'auto',
        renderHTML: (attributes) => ({ width: attributes.width }),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent)
  },
})

// -----------------------------------------------------------------------------
// Component Props
// -----------------------------------------------------------------------------

export interface RichEditorProps {
  documentId: string
  initialContent: string
  onChange: (content: string, wordCount: number, characterCount: number) => void
  onSaveRequest?: () => void
  readOnly?: boolean
}

export function RichEditor({
  documentId,
  initialContent,
  onChange,
  onSaveRequest: _onSaveRequest,
  readOnly = false,
}: RichEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()

  // Slash Commands state
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })

  // Find & Replace state
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find')

  // Parse initial content safe for Tiptap
  const parsedContent = useCallback(() => {
    if (!initialContent) {
      return { type: 'doc', content: [{ type: 'paragraph' }] }
    }
    try {
      if (initialContent.trim().startsWith('{')) {
        return JSON.parse(initialContent)
      }
      return initialContent
    } catch {
      return initialContent
    }
  }, [initialContent])

  const editor = useEditor({
    editable: !readOnly,
    content: parsedContent(),
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Subscript,
      Superscript,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Indent,
      FormattingStyles,
      BulletList,
      OrderedList,
      ListItem,
      ListKeymap,
      TaskList,
      TaskItem.configure({ nested: true }),
      Blockquote,
      HorizontalRule,
      HardBreak,
      Table.configure({ resizable: true, handleWidth: 8, cellMinWidth: 25 }),
      CustomTableRow,
      CustomTableHeader,
      CustomTableCell,
      TableActiveFeedback,
      TableRowResizer,
      CustomCodeBlock.configure({ lowlight }),
      CustomImage.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Type '/' for commands or start writing…" }),
      CharacterCount,
      History,
      Typography,
      Dropcursor.configure({ color: 'var(--sp-color-accent, #007acc)', width: 2 }),
      Gapcursor,
    ],
    editorProps: {
      attributes: {
        spellcheck: settings.spellCheck ? 'true' : 'false',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = JSON.stringify(ed.getJSON())
      const words = ed.storage.characterCount.words()
      const chars = ed.storage.characterCount.characters()
      onChange(json, words, chars)

      // Detect slash command
      const { state } = ed
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '\n', '\0')

      const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/)
      if (slashMatch) {
        const query = slashMatch[1]
        const coords = ed.view.coordsAtPos(from)
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          setSlashPosition({
            top: coords.bottom - containerRect.top + (containerRef.current?.scrollTop || 0),
            left: Math.max(16, coords.left - containerRect.left),
          })
          setSlashQuery(query)
          setSlashOpen(true)
        }
      } else {
        setSlashOpen(false)
      }
    },
  })

  // Dynamically synchronize spellcheck attribute with settings
  useEffect(() => {
    if (editor && editor.view?.dom) {
      editor.view.dom.setAttribute('spellcheck', settings.spellCheck ? 'true' : 'false')
    }
  }, [editor, settings.spellCheck])

  // Listen for Find & Replace keyboard triggers from global shortcuts
  useEffect(() => {
    const handleFind = () => {
      setFindReplaceMode('find')
      setFindReplaceOpen(true)
    }
    const handleReplace = () => {
      setFindReplaceMode('replace')
      setFindReplaceOpen(true)
    }

    window.addEventListener('scratchpad:open-find', handleFind)
    window.addEventListener('scratchpad:open-replace', handleReplace)

    return () => {
      window.removeEventListener('scratchpad:open-find', handleFind)
      window.removeEventListener('scratchpad:open-replace', handleReplace)
    }
  }, [])

  // Handle image upload & insertion
  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor) return
      try {
        const record = await attachmentService.store(documentId, file, file.name, 'image')
        const url = await attachmentService.resolve(record.id)
        editor
          .chain()
          .focus()
          .setImage({
            src: url || '',
            alt: file.name,
            // @ts-expect-error custom attribute
            attachmentId: record.id,
            alignment: 'center',
          })
          .run()
      } catch (err) {
        console.error('Failed to attach image:', err)
      }
    },
    [documentId, editor]
  )

  // Listen for custom image insertion event
  useEffect(() => {
    const handleInsertImageEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ file: File }>
      if (customEvent.detail?.file) {
        insertImageFile(customEvent.detail.file)
      }
    }
    window.addEventListener('scratchpad:insert-image', handleInsertImageEvent)
    return () => {
      window.removeEventListener('scratchpad:insert-image', handleInsertImageEvent)
    }
  }, [insertImageFile])

  // Drag & drop images handler
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          insertImageFile(file)
        }
      }
    },
    [insertImageFile]
  )

  // Paste image handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0]
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          insertImageFile(file)
        }
      }
    },
    [insertImageFile]
  )

  if (!editor) {
    return <div className="rich-editor-loading">Loading editor…</div>
  }

  return (
    <div
      ref={containerRef}
      className="rich-editor"
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Top Formatting Toolbar */}
      <RichEditorToolbar
        editor={editor}
        onOpenFindReplace={() => setFindReplaceOpen(!findReplaceOpen)}
        isFindReplaceOpen={findReplaceOpen}
        onInsertImageFile={insertImageFile}
      />

      {/* Floating Find & Replace Bar */}
      {findReplaceOpen && (
        <FindReplaceBar
          editor={editor}
          initialMode={findReplaceMode}
          onClose={() => setFindReplaceOpen(false)}
        />
      )}

      {/* Floating Bubble & Contextual Menus */}
      <EditorBubbleMenu editor={editor} />
      <TableToolbar editor={editor} containerRef={containerRef} documentId={documentId} />

      {/* Slash Commands Dropdown */}
      <SlashCommands
        editor={editor}
        isOpen={slashOpen}
        query={slashQuery}
        position={slashPosition}
        onClose={() => setSlashOpen(false)}
      />

      {/* Main Content Area */}
      <div className="rich-editor-content-wrapper">
        <EditorContent editor={editor} className="rich-editor-content" />
      </div>
    </div>
  )
}
