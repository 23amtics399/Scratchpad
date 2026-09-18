import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  X,
  FileText,
  FileCode,
  File,
  CaseSensitive,
  WholeWord,
  Clock,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import {
  workspaceSearchService,
  type WorkspaceSearchResult,
} from '@/services/WorkspaceSearchService.js'
import type { DocumentType } from '@/types/index.js'
import './WorkspaceSearchModal.css'

interface WorkspaceSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WorkspaceSearchModal({ isOpen, onClose }: WorkspaceSearchModalProps) {
  const { workspace, openDocument } = useWorkspace()

  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [results, setResults] = useState<WorkspaceSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen])

  // Execute search
  const performSearch = useCallback(async () => {
    if (!workspace || !query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    setIsSearching(true)
    try {
      const hits = await workspaceSearchService.search(workspace.id, query, {
        caseSensitive,
        wholeWord,
        typeFilter,
      })
      setResults(hits)
      setSelectedIndex(0)
    } finally {
      setIsSearching(false)
    }
  }, [workspace, query, caseSensitive, wholeWord, typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch()
    }, 150)
    return () => clearTimeout(timer)
  }, [performSearch])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        openDocument(results[selectedIndex].document.id)
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'markdown':
        return <FileCode size={14} className="doc-icon doc-icon--markdown" />
      case 'plain':
        return <File size={14} className="doc-icon doc-icon--plain" />
      case 'rich':
      default:
        return <FileText size={14} className="doc-icon doc-icon--rich" />
    }
  }

  return (
    <div className="workspace-search-backdrop" onClick={onClose}>
      <div
        className="workspace-search-modal"
        role="dialog"
        aria-label="Workspace Search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="workspace-search-header">
          <div className="workspace-search-input-wrap">
            <Search size={16} className="workspace-search-lens-icon" />
            <input
              ref={inputRef}
              type="text"
              className="workspace-search-input"
              placeholder="Search documents by title, content, or tags… (Ctrl+Alt+F)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="workspace-search-clear-btn"
                onClick={() => setQuery('')}
                title="Clear query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="workspace-search-options">
            <button
              type="button"
              className={`search-opt-btn ${caseSensitive ? 'is-active' : ''}`}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Match Case"
            >
              <CaseSensitive size={14} />
            </button>
            <button
              type="button"
              className={`search-opt-btn ${wholeWord ? 'is-active' : ''}`}
              onClick={() => setWholeWord(!wholeWord)}
              title="Match Whole Word"
            >
              <WholeWord size={14} />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="workspace-search-filters">
          {(['all', 'rich', 'markdown', 'plain'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-chip ${typeFilter === filter ? 'is-active' : ''}`}
              onClick={() => setTypeFilter(filter)}
            >
              {filter === 'all'
                ? 'All Documents'
                : filter === 'rich'
                ? 'Rich Text'
                : filter === 'markdown'
                ? 'Markdown'
                : 'Plain Text'}
            </button>
          ))}
          <span className="search-results-summary">
            {isSearching
              ? 'Searching…'
              : query.trim()
              ? `${results.length} result${results.length === 1 ? '' : 's'}`
              : 'Type to search workspace'}
          </span>
        </div>

        {/* Results List */}
        <div className="workspace-search-results" role="listbox">
          {results.length > 0 ? (
            results.map((res, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={res.document.id}
                  className={`search-result-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    openDocument(res.document.id)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="search-result-header">
                    <div className="search-result-title-group">
                      {getTypeIcon(res.document.type)}
                      <span className="search-result-title">{res.document.title}</span>
                    </div>
                    <div className="search-result-meta">
                      <span className="search-result-badge">
                        {res.matchCount} match{res.matchCount === 1 ? '' : 'es'}
                      </span>
                      <span className="search-result-time">
                        <Clock size={11} style={{ marginRight: 3 }} />
                        {new Date(res.document.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="search-result-snippet">{res.snippet}</div>
                </div>
              )
            })
          ) : query.trim() && !isSearching ? (
            <div className="workspace-search-empty">
              No matching documents found in this workspace for "{query}"
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        <div className="workspace-search-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
