import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  dropCursor,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from '@codemirror/search'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  Columns,
  Eye,
  FileCode,
  Copy,
  Check,
} from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext.js'
import './CodeMirrorEditor.css'

export interface CodeMirrorEditorProps {
  documentId: string
  initialContent: string
  mode: 'markdown' | 'plain'
  onChange: (content: string, wordCount: number, characterCount: number) => void
  readOnly?: boolean
}

export function CodeMirrorEditor({
  initialContent,
  mode,
  onChange,
  readOnly = false,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { settings } = useSettings()

  const [rawText, setRawText] = useState(initialContent)
  const [viewMode, setViewMode] = useState<'source' | 'split' | 'preview'>('source')
  const [copied, setCopied] = useState(false)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const initialContentRef = useRef(initialContent)

  // Configure marked options
  marked.setOptions({
    gfm: true,
    breaks: true,
  })

  // Calculate live word and character counts
  const computeCounts = useCallback((text: string) => {
    const trimmed = text.trim()
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
    const chars = text.length
    return { words, chars }
  }, [])

  const computeCountsRef = useRef(computeCounts)
  computeCountsRef.current = computeCounts

  // Initialize CodeMirror instance
  useEffect(() => {
    if (!editorRef.current) return

    // Preserve active document text across settings changes
    const currentDoc = viewRef.current ? viewRef.current.state.doc.toString() : initialContentRef.current

    // Clean up previous view if any
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    const isSystemDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark)

    const extensions = [
      ...(settings.showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
      highlightActiveLine(),
      history(),
      drawSelection(),
      dropCursor(),
      ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newText = update.state.doc.toString()
          setRawText(newText)
          const { words, chars } = computeCountsRef.current(newText)
          onChangeRef.current(newText, words, chars)
        }
      }),
    ]

    if (mode === 'markdown') {
      extensions.push(markdown())
    }

    if (isDark) {
      extensions.push(oneDark)
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    const state = EditorState.create({
      doc: currentDoc,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [mode, readOnly, settings.theme, settings.showLineNumbers, settings.wordWrap])

  // Listen for search and outline navigation trigger events
  useEffect(() => {
    const handleSearch = () => {
      if (viewRef.current) {
        openSearchPanel(viewRef.current)
      }
    }

    const handleNavigateLine = (e: Event) => {
      const ce = e as CustomEvent<{ line: number }>
      if (typeof ce.detail?.line === 'number' && viewRef.current) {
        const view = viewRef.current
        const lineNum = Math.min(ce.detail.line + 1, view.state.doc.lines)
        const linePos = view.state.doc.line(lineNum).from
        view.dispatch({
          selection: { anchor: linePos },
          scrollIntoView: true,
        })
        view.focus()
      }
    }

    window.addEventListener('scratchpad:open-find', handleSearch)
    window.addEventListener('scratchpad:open-replace', handleSearch)
    window.addEventListener('scratchpad:navigate-markdown-line', handleNavigateLine)

    return () => {
      window.removeEventListener('scratchpad:open-find', handleSearch)
      window.removeEventListener('scratchpad:open-replace', handleSearch)
      window.removeEventListener('scratchpad:navigate-markdown-line', handleNavigateLine)
    }
  }, [])

  // Copy raw content
  const handleCopy = async (textInput?: string | unknown) => {
    const text = typeof textInput === 'string'
      ? textInput
      : (viewRef.current?.state.doc.toString() || rawText)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Rendered HTML preview for Markdown
  const renderedMarkdown = DOMPurify.sanitize(marked.parse(rawText) as string)

  return (
    <div className={`codemirror-editor codemirror-editor--${mode}`}>
      {/* Subheader Toolbar */}
      <div className="codemirror-toolbar">
        <div className="codemirror-toolbar-left">
          <span className="codemirror-mode-tag">
            {mode === 'markdown' ? 'Markdown Source' : 'Plain Text'}
          </span>
        </div>

        <div className="codemirror-toolbar-right">
          {mode === 'markdown' && (
            <div className="codemirror-view-toggle">
              <button
                type="button"
                className={`view-btn ${viewMode === 'source' ? 'is-active' : ''}`}
                onClick={() => setViewMode('source')}
                title="Edit Source Only"
              >
                <FileCode size={13} />
                <span>Source</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'split' ? 'is-active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Split View (Editor + Live Preview)"
              >
                <Columns size={13} />
                <span>Split</span>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'preview' ? 'is-active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Preview Rendered Markdown"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="codemirror-copy-btn"
            onClick={handleCopy}
            title="Copy all text"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className={`codemirror-workspace codemirror-workspace--${viewMode}`}>
        {/* Source Editor */}
        <div
          ref={editorRef}
          className={`codemirror-pane ${viewMode === 'preview' ? 'codemirror-pane--hidden' : ''}`}
        />

        {/* Live Preview for Markdown */}
        {mode === 'markdown' && (viewMode === 'split' || viewMode === 'preview') && (
          <div className="codemirror-preview-pane">
            <div
              className="codemirror-preview-content"
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
