import { useState, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import {
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  Replace,
  ReplaceAll,
} from 'lucide-react'
import './FindReplaceBar.css'

interface FindReplaceBarProps {
  editor: Editor
  initialMode?: 'find' | 'replace'
  onClose: () => void
}

interface MatchPosition {
  from: number
  to: number
}

export function FindReplaceBar({
  editor,
  initialMode = 'find',
  onClose,
}: FindReplaceBarProps) {
  const [mode, setMode] = useState<'find' | 'replace'>(initialMode)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [matches, setMatches] = useState<MatchPosition[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const findInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus()
    findInputRef.current?.select()
  }, [])

  // Search logic across Tiptap document
  const runSearch = useCallback(() => {
    if (!searchTerm) {
      setMatches([])
      setCurrentIndex(-1)
      return
    }

    const { doc } = editor.state
    const found: MatchPosition[] = []

    // Build regex
    let flags = 'g'
    if (!caseSensitive) flags += 'i'
    let escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) {
      escaped = `\\b${escaped}\\b`
    }

    let regex: RegExp
    try {
      regex = new RegExp(escaped, flags)
    } catch {
      return
    }

    // Traverse all text nodes and map matches back to document coordinates
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        let match: RegExpExecArray | null
        while ((match = regex.exec(node.text)) !== null) {
          const from = pos + match.index
          const to = from + match[0].length
          found.push({ from, to })
        }
      }
    })

    setMatches(found)

    if (found.length > 0) {
      const idx = 0
      setCurrentIndex(idx)
      editor.commands.setTextSelection({ from: found[idx].from, to: found[idx].to })
      editor.commands.scrollIntoView()
    } else {
      setCurrentIndex(-1)
    }
  }, [editor, searchTerm, caseSensitive, wholeWord])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  // Navigate to Next Match
  const handleNext = useCallback(() => {
    if (matches.length === 0) return
    const nextIdx = (currentIndex + 1) % matches.length
    setCurrentIndex(nextIdx)
    editor.commands.setTextSelection({
      from: matches[nextIdx].from,
      to: matches[nextIdx].to,
    })
    editor.commands.scrollIntoView()
  }, [editor, matches, currentIndex])

  // Navigate to Previous Match
  const handlePrev = useCallback(() => {
    if (matches.length === 0) return
    const prevIdx = (currentIndex - 1 + matches.length) % matches.length
    setCurrentIndex(prevIdx)
    editor.commands.setTextSelection({
      from: matches[prevIdx].from,
      to: matches[prevIdx].to,
    })
    editor.commands.scrollIntoView()
  }, [editor, matches, currentIndex])

  // Replace Current Match
  const handleReplace = useCallback(() => {
    if (matches.length === 0 || currentIndex < 0) return
    const current = matches[currentIndex]

    editor
      .chain()
      .focus()
      .setTextSelection({ from: current.from, to: current.to })
      .insertContent(replaceTerm)
      .run()

    // Re-run search after replacement
    runSearch()
  }, [editor, matches, currentIndex, replaceTerm, runSearch])

  // Replace All Matches
  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return

    // Replace from bottom to top to preserve positions
    editor.commands.focus()
    const sorted = [...matches].sort((a, b) => b.from - a.from)

    for (const m of sorted) {
      editor
        .chain()
        .setTextSelection({ from: m.from, to: m.to })
        .insertContent(replaceTerm)
        .run()
    }

    runSearch()
  }, [editor, matches, replaceTerm, runSearch])

  // Handle Enter / Shift+Enter / Escape keyboard actions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handlePrev()
      } else {
        handleNext()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      editor.commands.focus()
    }
  }

  return (
    <div className="find-replace-bar" role="dialog" aria-label="Find and Replace in document">
      <div className="find-replace-row">
        <div className="find-input-wrap">
          <input
            ref={findInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Find…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="find-match-count">
            {matches.length > 0
              ? `${currentIndex + 1} of ${matches.length}`
              : searchTerm
              ? 'No match'
              : ''}
          </span>
        </div>

        {/* Options */}
        <button
          type="button"
          className={`fr-icon-btn ${caseSensitive ? 'is-active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match Case (Alt+C)"
        >
          <CaseSensitive size={14} />
        </button>
        <button
          type="button"
          className={`fr-icon-btn ${wholeWord ? 'is-active' : ''}`}
          onClick={() => setWholeWord(!wholeWord)}
          title="Match Whole Word (Alt+W)"
        >
          <WholeWord size={14} />
        </button>

        {/* Nav */}
        <button
          type="button"
          className="fr-icon-btn"
          onClick={handlePrev}
          disabled={matches.length === 0}
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="fr-icon-btn"
          onClick={handleNext}
          disabled={matches.length === 0}
          title="Next Match (Enter)"
        >
          <ChevronDown size={14} />
        </button>

        {/* Toggle Replace Mode */}
        <button
          type="button"
          className={`fr-icon-btn ${mode === 'replace' ? 'is-active' : ''}`}
          onClick={() => setMode(mode === 'find' ? 'replace' : 'find')}
          title="Toggle Replace Mode"
        >
          <Replace size={14} />
        </button>

        {/* Close */}
        <button
          type="button"
          className="fr-icon-btn"
          onClick={() => {
            onClose()
            editor.commands.focus()
          }}
          title="Close (Escape)"
        >
          <X size={14} />
        </button>
      </div>

      {mode === 'replace' && (
        <div className="find-replace-row find-replace-row--replace">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace with…"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="fr-text-btn"
            onClick={handleReplace}
            disabled={matches.length === 0}
            title="Replace current match"
          >
            Replace
          </button>
          <button
            type="button"
            className="fr-text-btn"
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            title="Replace all matches in document"
          >
            <ReplaceAll size={13} style={{ marginRight: 4 }} />
            Replace All
          </button>
        </div>
      )}
    </div>
  )
}
