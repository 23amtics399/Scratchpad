import React, { useRef, useEffect } from 'react'
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCode,
  File as FileIcon,
  PanelLeftOpen,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import type { DocumentType } from '@/types/index.js'
import './TabBar.css'

export function TabBar() {
  const {
    tabs,
    activeTabId,
    documents,
    openDocument,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    createDocument,
    duplicateDocument,
  } = useWorkspace()

  const { showContextMenu, setSidebarOpen, sidebarOpen } = useUI()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Map for fast document meta lookup
  const docMap = new Map(documents.map((d) => [d.id, d]))

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return
    const activeEl = scrollRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`)
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  // Horizontal wheel scroll handler
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -160, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 160, behavior: 'smooth' })
    }
  }

  const handleTabContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault()
    e.stopPropagation()

    showContextMenu(e.clientX, e.clientY, [
      {
        id: 'close',
        label: 'Close Tab',
        shortcut: 'Ctrl+W',
        action: () => closeTab(docId),
      },
      {
        id: 'close-others',
        label: 'Close Other Tabs',
        action: () => closeOtherTabs(docId),
      },
      {
        id: 'close-right',
        label: 'Close Tabs to the Right',
        action: () => closeTabsToRight(docId),
      },
      {
        id: 'close-all',
        label: 'Close All Tabs',
        action: () => closeAllTabs(),
      },
      { id: 'sep-1', label: '', separator: true },
      {
        id: 'duplicate',
        label: 'Duplicate Document',
        action: () => duplicateDocument(docId),
      },
      {
        id: 'reveal',
        label: 'Reveal in Explorer',
        action: () => setSidebarOpen(true),
      },
    ])
  }

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'markdown':
        return <FileCode size={14} className="tab-icon tab-icon--md" />
      case 'plain':
        return <FileIcon size={14} className="tab-icon tab-icon--plain" />
      case 'rich':
      default:
        return <FileText size={14} className="tab-icon tab-icon--rich" />
    }
  }

  return (
    <div id="scratchpad-tabbar" className="tabbar" role="tablist" aria-label="Open documents">
      {/* Restore Sidebar button when collapsed */}
      {!sidebarOpen && (
        <button
          id="tabbar-btn-restore-sidebar"
          type="button"
          className="tabbar__restore-sidebar-btn"
          title="Restore Sidebar"
          aria-label="Restore Sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      {/* Scroll left button */}
      <button
        id="tabbar-btn-scroll-left"
        type="button"
        className="tabbar__scroll-btn tabbar__scroll-btn--left"
        aria-label="Scroll tabs left"
        onClick={scrollLeft}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Tabs scroll strip */}
      <div ref={scrollRef} className="tabbar__strip" onWheel={handleWheel}>
        {tabs.map((tab) => {
          const doc = docMap.get(tab.documentId)
          const title = doc?.title || 'Untitled'
          const docType = doc?.type || 'rich'
          const isActive = tab.documentId === activeTabId

          return (
            <div
              key={tab.documentId}
              id={`tab-${tab.documentId}`}
              data-tab-id={tab.documentId}
              role="tab"
              aria-selected={isActive}
              className={`tabbar__tab ${isActive ? 'tabbar__tab--active' : ''}`}
              onClick={() => openDocument(tab.documentId)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault()
                  closeTab(tab.documentId)
                }
              }}
              onContextMenu={(e) => handleTabContextMenu(e, tab.documentId)}
            >
              {getDocIcon(docType)}
              <span className="tabbar__tab-title" title={title}>
                {title}
              </span>

              <button
                id={`tab-close-${tab.documentId}`}
                type="button"
                className="tabbar__tab-close"
                aria-label={`Close tab for ${title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.documentId)
                }}
              >
                <X size={13} />
              </button>
            </div>
          )
        })}

        {/* Quick new document button */}
        <button
          id="tabbar-btn-new-tab"
          type="button"
          className="tabbar__new-btn"
          title="New Document"
          aria-label="New Document"
          onClick={() => createDocument('Untitled', 'rich', null)}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scroll right button */}
      <button
        id="tabbar-btn-scroll-right"
        type="button"
        className="tabbar__scroll-btn tabbar__scroll-btn--right"
        aria-label="Scroll tabs right"
        onClick={scrollRight}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
