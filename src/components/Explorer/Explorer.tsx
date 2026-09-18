import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  FileCode,
  File as FileIcon,
  Plus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Files,
  Search,
  MoreVertical,
  X,
  PanelLeftClose,
  FolderMinus,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useUI } from '@/contexts/UIContext.js'
import type { DocumentMeta, FolderRecord, DocumentType } from '@/types/index.js'
import { DocumentPropertiesModal } from '@/components/DocumentProperties/DocumentPropertiesModal.js'
import './Explorer.css'

function isDescendantFolder(allFolders: FolderRecord[], parentId: string, potentialChildId: string): boolean {
  if (parentId === potentialChildId) return true
  let current: FolderRecord | undefined = allFolders.find((f) => f.id === potentialChildId)
  while (current && current.parentId) {
    if (current.parentId === parentId) return true
    const nextParentId: string = current.parentId
    current = allFolders.find((f) => f.id === nextParentId)
  }
  return false
}

type ExplorerTab = 'tree' | 'favorites' | 'recent'

export function Explorer() {
  const {
    workspace,
    folders,
    documents,
    activeTabId,
    selectedFolderId,
    setSelectedFolderId,
    openDocument,
    createDocument,
    createFolder,
    renameDocument,
    deleteDocument,
    duplicateDocument,
    toggleFavorite,
    renameFolder,
    deleteFolder,
    moveDocument,
    moveFolder,
  } = useWorkspace()

  const { showContextMenu, toggleSidebar } = useUI()

  const [activeTab, setActiveTab] = useState<ExplorerTab>('tree')
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Deterministic destination folder resolution:
  // 1. Explicitly selected folder in Explorer
  // 2. Active document's folderId
  // 3. Workspace root (null)
  const getDestinationFolderId = useCallback((): string | null => {
    if (selectedFolderId !== null && folders.some((f) => f.id === selectedFolderId)) {
      return selectedFolderId
    }
    if (activeTabId) {
      const activeDoc = documents.find((d) => d.id === activeTabId)
      if (activeDoc && activeDoc.folderId && folders.some((f) => f.id === activeDoc.folderId)) {
        return activeDoc.folderId
      }
    }
    return null
  }, [selectedFolderId, folders, activeTabId, documents])

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'doc' | 'folder'; id: string } | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null | 'root'>(null)

  // Document properties modal state
  const [propertiesDoc, setPropertiesDoc] = useState<DocumentMeta | null>(null)

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<{ id: string; type: 'doc' | 'folder' } | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Creation state inside a specific folder
  const [creatingInFolder, setCreatingInFolder] = useState<{ folderId: string | null; type: 'doc' | 'folder' } | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const newRef = useRef<HTMLInputElement>(null)

  // Header dropdown states for New Document and More Actions
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showMoreHeaderActions, setShowMoreHeaderActions] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)
  const moreActionsRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click or viewport resize
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false)
      }
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setShowMoreHeaderActions(false)
      }
    }
    const handleViewportResize = () => {
      setShowNewMenu(false)
      setShowMoreHeaderActions(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scratchpad:viewport-resize', handleViewportResize)
    window.addEventListener('resize', handleViewportResize)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scratchpad:viewport-resize', handleViewportResize)
      window.removeEventListener('resize', handleViewportResize)
    }
  }, [])

  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingItemId])

  useEffect(() => {
    if (creatingInFolder && newRef.current) {
      newRef.current.focus()
    }
  }, [creatingInFolder])

  // Listen for open-properties event from menubar or command palette
  useEffect(() => {
    const handleOpenProps = () => {
      const active = documents.find((d) => d.id === activeTabId)
      if (active) setPropertiesDoc(active)
    }
    window.addEventListener('scratchpad:open-properties', handleOpenProps)
    return () => window.removeEventListener('scratchpad:open-properties', handleOpenProps)
  }, [documents, activeTabId])

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const collapseAllFolders = () => {
    setExpandedFolders(new Set())
  }

  // Handle Document Context Menu
  const handleDocContextMenu = (e: React.MouseEvent, doc: DocumentMeta) => {
    e.preventDefault()
    e.stopPropagation()

    showContextMenu(e.clientX, e.clientY, [
      {
        id: 'open',
        label: 'Open',
        action: () => openDocument(doc.id),
      },
      {
        id: 'favorite',
        label: doc.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        action: () => toggleFavorite(doc.id),
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        action: () => duplicateDocument(doc.id),
      },
      {
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        action: () => {
          setEditingItemId({ id: doc.id, type: 'doc' })
          setEditingTitle(doc.title)
        },
      },
      { id: 'sep-1', label: '', separator: true },
      {
        id: 'delete',
        label: 'Delete',
        danger: true,
        shortcut: 'Del',
        action: () => {
          deleteDocument(doc.id)
        },
      },
      { id: 'sep-2', label: '', separator: true },
      {
        id: 'properties',
        label: 'Properties...',
        action: () => {
          setPropertiesDoc(doc)
        },
      },
    ])
  }

  // Handle Folder Context Menu
  const handleFolderContextMenu = (e: React.MouseEvent, folder: FolderRecord) => {
    e.preventDefault()
    e.stopPropagation()

    showContextMenu(e.clientX, e.clientY, [
      {
        id: 'new-doc-inside',
        label: 'New Document Here',
        action: () => {
          setExpandedFolders((prev) => new Set(prev).add(folder.id))
          setCreatingInFolder({ folderId: folder.id, type: 'doc' })
          setNewTitle('Untitled')
        },
      },
      {
        id: 'new-folder-inside',
        label: 'New Subfolder',
        action: () => {
          setExpandedFolders((prev) => new Set(prev).add(folder.id))
          setCreatingInFolder({ folderId: folder.id, type: 'folder' })
          setNewTitle('New Folder')
        },
      },
      { id: 'sep-1', label: '', separator: true },
      {
        id: 'rename-folder',
        label: 'Rename',
        shortcut: 'F2',
        action: () => {
          setEditingItemId({ id: folder.id, type: 'folder' })
          setEditingTitle(folder.name)
        },
      },
      {
        id: 'delete-folder',
        label: 'Delete Folder',
        danger: true,
        action: () => {
          deleteFolder(folder.id)
        },
      },
    ])
  }

  // Finish editing
  const commitEdit = () => {
    if (!editingItemId) return
    const trimmed = editingTitle.trim()
    if (trimmed) {
      if (editingItemId.type === 'doc') {
        renameDocument(editingItemId.id, trimmed)
      } else {
        renameFolder(editingItemId.id, trimmed)
      }
    }
    setEditingItemId(null)
  }

  // Finish creating
  const commitCreate = async () => {
    if (!creatingInFolder) return
    const trimmed = newTitle.trim() || (creatingInFolder.type === 'doc' ? 'Untitled' : 'New Folder')
    if (creatingInFolder.type === 'doc') {
      const doc = await createDocument(trimmed, 'rich', creatingInFolder.folderId)
      if (doc) {
        openDocument(doc.id)
        setSelectedFolderId(null)
      }
    } else {
      const folder = await createFolder(trimmed, creatingInFolder.folderId)
      if (folder) {
        setSelectedFolderId(folder.id)
      }
    }
    if (creatingInFolder.folderId) {
      setExpandedFolders((prev) => new Set(prev).add(creatingInFolder.folderId!))
    }
    setCreatingInFolder(null)
  }

  // Filtered documents when search text is entered
  const filteredDocs = useMemo(() => {
    if (!searchFilter.trim()) return null
    const lower = searchFilter.toLowerCase()
    return documents.filter((d) => d.title.toLowerCase().includes(lower))
  }, [documents, searchFilter])

  // Get documents grouped by folderId
  const docsByFolder = useMemo(() => {
    const map = new Map<string | null, DocumentMeta[]>()
    for (const doc of documents) {
      const list = map.get(doc.folderId) ?? []
      list.push(doc)
      map.set(doc.folderId, list)
    }
    return map
  }, [documents])

  // Get child folders by parentId
  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, FolderRecord[]>()
    for (const folder of folders) {
      const list = map.get(folder.parentId) ?? []
      list.push(folder)
      map.set(folder.parentId, list)
    }
    return map
  }, [folders])

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'markdown':
        return <FileCode size={15} className="explorer-icon explorer-icon--md" />
      case 'plain':
        return <FileIcon size={15} className="explorer-icon explorer-icon--plain" />
      case 'rich':
      default:
        return <FileText size={15} className="explorer-icon explorer-icon--rich" />
    }
  }

  // Render tree item recursively
  const renderFolderItem = (folder: FolderRecord, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const subFolders = foldersByParent.get(folder.id) ?? []
    const subDocs = docsByFolder.get(folder.id) ?? []
    const isEditing = editingItemId?.id === folder.id && editingItemId.type === 'folder'

    return (
      <div key={folder.id} className="explorer-tree-branch">
        <div
          id={`explorer-folder-${folder.id}`}
          className={`explorer-row explorer-row--folder ${
            selectedFolderId === folder.id ? 'explorer-row--selected' : ''
          } ${
            dropTargetId === folder.id ? 'explorer-row--drop-target' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedFolderId(folder.id)
            toggleFolderExpand(folder.id)
          }}
          onContextMenu={(e) => {
            setSelectedFolderId(folder.id)
            handleFolderContextMenu(e, folder)
          }}
          role="treeitem"
          aria-expanded={isExpanded}
          aria-selected={selectedFolderId === folder.id}
          draggable={!isEditing}
          onDragStart={(e) => {
            if (isEditing) {
              e.preventDefault()
              return
            }
            setDraggedItem({ type: 'folder', id: folder.id })
            e.dataTransfer.setData(
              'application/x-scratchpad-item',
              JSON.stringify({ type: 'folder', id: folder.id })
            )
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setDraggedItem(null)
            setDropTargetId(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!draggedItem) return
            if (draggedItem.type === 'folder') {
              if (isDescendantFolder(folders, draggedItem.id, folder.id)) {
                e.dataTransfer.dropEffect = 'none'
                return
              }
            }
            e.dataTransfer.dropEffect = 'move'
            if (dropTargetId !== folder.id) {
              setDropTargetId(folder.id)
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation()
            if (dropTargetId === folder.id) {
              setDropTargetId(null)
            }
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            setDropTargetId(null)
            const raw = e.dataTransfer.getData('application/x-scratchpad-item')
            if (!raw) return
            try {
              const item = JSON.parse(raw) as { type: 'doc' | 'folder'; id: string }
              if (item.type === 'doc') {
                await moveDocument(item.id, folder.id)
                setExpandedFolders((prev) => new Set(prev).add(folder.id))
              } else if (item.type === 'folder') {
                if (!isDescendantFolder(folders, item.id, folder.id)) {
                  await moveFolder(item.id, folder.id)
                  setExpandedFolders((prev) => new Set(prev).add(folder.id))
                }
              }
            } catch (err) {
              console.error('Folder drop error:', err)
            }
          }}
        >
          <button
            type="button"
            className="explorer-collapse-btn"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            onClick={(e) => {
              e.stopPropagation()
              toggleFolderExpand(folder.id)
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {isExpanded ? (
            <FolderOpen size={16} className="explorer-folder-icon" />
          ) : (
            <FolderIcon size={16} className="explorer-folder-icon" />
          )}

          {isEditing ? (
            <input
              ref={editInputRef}
              className="explorer-inline-input"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditingItemId(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="explorer-row-label" title={folder.name}>{folder.name}</span>
          )}

          <span className="explorer-row-count">{subDocs.length}</span>
        </div>

        {isExpanded && (
          <div className="explorer-tree-children">
            {creatingInFolder?.folderId === folder.id && (
              <div
                className="explorer-row explorer-row--creating"
                style={{ paddingLeft: `${24 + level * 14}px` }}
              >
                {creatingInFolder.type === 'doc' ? <FileText size={15} /> : <FolderIcon size={15} />}
                <input
                  ref={newRef}
                  className="explorer-inline-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={commitCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCreate()
                    if (e.key === 'Escape') setCreatingInFolder(null)
                  }}
                  placeholder={creatingInFolder.type === 'doc' ? 'Document title...' : 'Folder name...'}
                />
              </div>
            )}

            {subFolders.map((sub) => renderFolderItem(sub, level + 1))}
            {subDocs.map((doc) => renderDocItem(doc, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // Render Document Row
  const renderDocItem = (doc: DocumentMeta, level = 0) => {
    const isActive = activeTabId === doc.id
    const isEditing = editingItemId?.id === doc.id && editingItemId.type === 'doc'

    return (
      <div
        key={doc.id}
        id={`explorer-doc-${doc.id}`}
        className={`explorer-row explorer-row--doc ${isActive ? 'explorer-row--active' : ''}`}
        style={{ paddingLeft: `${18 + level * 14}px` }}
        onClick={() => {
          setSelectedFolderId(null)
          openDocument(doc.id)
        }}
        onContextMenu={(e) => handleDocContextMenu(e, doc)}
        role="treeitem"
        aria-selected={isActive}
        draggable={!isEditing}
        onDragStart={(e) => {
          if (isEditing) {
            e.preventDefault()
            return
          }
          setDraggedItem({ type: 'doc', id: doc.id })
          e.dataTransfer.setData(
            'application/x-scratchpad-item',
            JSON.stringify({ type: 'doc', id: doc.id })
          )
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDraggedItem(null)
          setDropTargetId(null)
        }}
      >
        {getDocIcon(doc.type)}

        {isEditing ? (
          <input
            ref={editInputRef}
            className="explorer-inline-input"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditingItemId(null)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="explorer-row-label" title={doc.title}>{doc.title}</span>
        )}

        <div className="explorer-row-actions">
          {doc.isFavorite && <Star size={12} className="explorer-star-icon" />}
          <button
            type="button"
            className="explorer-row-more-btn"
            aria-label="More actions"
            onClick={(e) => handleDocContextMenu(e, doc)}
          >
            <MoreVertical size={13} />
          </button>
        </div>
      </div>
    )
  }

  const topLevelFolders = foldersByParent.get(null) ?? []
  const rootDocs = docsByFolder.get(null) ?? []
  const favoriteDocs = useMemo(() => documents.filter((d) => d.isFavorite), [documents])
  const recentDocs = useMemo(() => {
    return [...documents].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
  }, [documents])

  return (
    <div id="scratchpad-explorer" className="explorer" aria-label="Workspace Explorer">
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-header__title">
          <span className="explorer-header__workspace-name" title={workspace?.name ?? 'Workspace'}>
            {workspace?.name ?? 'Workspace'}
          </span>
        </div>

        <div className="explorer-header__actions">
          {/* Primary [+ New ▾] Action */}
          <div ref={newMenuRef} className="explorer-new-btn-group">
            <button
              id="explorer-new-btn"
              type="button"
              className="explorer-new-btn"
              title="Create a new document (Rich, Markdown, Plain)"
              aria-label="New Document"
              aria-haspopup="true"
              aria-expanded={showNewMenu}
              onClick={() => setShowNewMenu((prev) => !prev)}
            >
              <Plus size={13} />
              <span className="explorer-new-btn-text">New</span>
              <ChevronDown size={11} className={`explorer-new-chevron ${showNewMenu ? 'is-open' : ''}`} />
            </button>

            {showNewMenu && (
              <div className="explorer-new-menu" role="menu" aria-label="New Document Types">
                <button
                  id="explorer-new-rich-note"
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={async () => {
                    setShowNewMenu(false)
                    const targetFolderId = getDestinationFolderId()
                    const doc = await createDocument('Untitled', 'rich', targetFolderId)
                    if (targetFolderId) {
                      setExpandedFolders((prev) => new Set(prev).add(targetFolderId))
                    }
                    if (doc) {
                      openDocument(doc.id)
                      setSelectedFolderId(null)
                    }
                  }}
                >
                  <FileText size={14} className="explorer-icon--rich" />
                  <span>New Rich Note</span>
                </button>
                <button
                  id="explorer-new-md-note"
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={async () => {
                    setShowNewMenu(false)
                    const targetFolderId = getDestinationFolderId()
                    const doc = await createDocument('Untitled', 'markdown', targetFolderId)
                    if (targetFolderId) {
                      setExpandedFolders((prev) => new Set(prev).add(targetFolderId))
                    }
                    if (doc) {
                      openDocument(doc.id)
                      setSelectedFolderId(null)
                    }
                  }}
                >
                  <FileCode size={14} className="explorer-icon--md" />
                  <span>New Markdown Document</span>
                </button>
                <button
                  id="explorer-new-plain-note"
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={async () => {
                    setShowNewMenu(false)
                    const targetFolderId = getDestinationFolderId()
                    const doc = await createDocument('Untitled', 'plain', targetFolderId)
                    if (targetFolderId) {
                      setExpandedFolders((prev) => new Set(prev).add(targetFolderId))
                    }
                    if (doc) {
                      openDocument(doc.id)
                      setSelectedFolderId(null)
                    }
                  }}
                >
                  <FileIcon size={14} className="explorer-icon--plain" />
                  <span>New Plain Text Note</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop visible actions */}
          <button
            id="explorer-btn-new-folder"
            type="button"
            className="explorer-action-btn explorer-action-btn--desktop-only"
            title="New Folder"
            aria-label="New Folder"
            onClick={() => {
              const targetParentId = selectedFolderId !== null && folders.some((f) => f.id === selectedFolderId)
                ? selectedFolderId
                : null
              if (targetParentId) {
                setExpandedFolders((prev) => new Set(prev).add(targetParentId))
              }
              setCreatingInFolder({ folderId: targetParentId, type: 'folder' })
              setNewTitle('New Folder')
            }}
          >
            <FolderPlus size={15} />
          </button>

          <button
            id="explorer-btn-collapse-all"
            type="button"
            className="explorer-action-btn explorer-action-btn--desktop-only"
            title="Collapse All Folders"
            aria-label="Collapse All Folders"
            onClick={collapseAllFolders}
          >
            <FolderMinus size={15} />
          </button>

          {/* Secondary More Actions for tablet / compact layouts */}
          <div ref={moreActionsRef} className="explorer-more-actions-group">
            <button
              id="explorer-btn-more-actions"
              type="button"
              className="explorer-action-btn explorer-action-btn--compact"
              title="More Explorer Actions"
              aria-label="More Explorer Actions"
              aria-haspopup="true"
              aria-expanded={showMoreHeaderActions}
              onClick={() => setShowMoreHeaderActions((prev) => !prev)}
            >
              <MoreVertical size={15} />
            </button>

            {showMoreHeaderActions && (
              <div className="explorer-new-menu explorer-more-menu" role="menu" aria-label="More Explorer Actions">
                <button
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={() => {
                    setShowMoreHeaderActions(false)
                    const targetParentId = selectedFolderId !== null && folders.some((f) => f.id === selectedFolderId)
                      ? selectedFolderId
                      : null
                    if (targetParentId) {
                      setExpandedFolders((prev) => new Set(prev).add(targetParentId))
                    }
                    setCreatingInFolder({ folderId: targetParentId, type: 'folder' })
                    setNewTitle('New Folder')
                  }}
                >
                  <FolderPlus size={14} />
                  <span>New Folder</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={() => {
                    setShowMoreHeaderActions(false)
                    collapseAllFolders()
                  }}
                >
                  <FolderMinus size={14} />
                  <span>Collapse All Folders</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="explorer-new-menu-item"
                  onClick={() => {
                    setShowMoreHeaderActions(false)
                    toggleSidebar()
                  }}
                >
                  <PanelLeftClose size={14} />
                  <span>Close Sidebar</span>
                </button>
              </div>
            )}
          </div>

          <button
            id="explorer-btn-toggle-sidebar"
            type="button"
            className="explorer-action-btn"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
            onClick={toggleSidebar}
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="explorer-search">
        <Search size={14} className="explorer-search-icon" />
        <input
          id="explorer-search-input"
          type="text"
          className="explorer-search-input"
          placeholder="Filter files..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        {searchFilter && (
          <button
            type="button"
            className="explorer-search-clear"
            aria-label="Clear filter"
            onClick={() => setSearchFilter('')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Mode navigation tabs (All / Favorites / Recent) */}
      <div className="explorer-tabs" role="tablist">
        <button
          id="explorer-tab-all"
          type="button"
          role="tab"
          aria-selected={activeTab === 'tree'}
          className={`explorer-tab-btn ${activeTab === 'tree' ? 'explorer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('tree')}
        >
          <Files size={13} />
          <span>Files</span>
        </button>
        <button
          id="explorer-tab-favorites"
          type="button"
          role="tab"
          aria-selected={activeTab === 'favorites'}
          className={`explorer-tab-btn ${activeTab === 'favorites' ? 'explorer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Star size={13} />
          <span>Favorites</span>
          {favoriteDocs.length > 0 && <span className="explorer-tab-badge">{favoriteDocs.length}</span>}
        </button>
        <button
          id="explorer-tab-recent"
          type="button"
          role="tab"
          aria-selected={activeTab === 'recent'}
          className={`explorer-tab-btn ${activeTab === 'recent' ? 'explorer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          <Clock size={13} />
          <span>Recent</span>
        </button>
      </div>

      {/* Content View */}
      <div className="explorer-content" role="tree">
        {filteredDocs !== null ? (
          /* Filtered search results */
          <div className="explorer-list">
            {filteredDocs.length === 0 ? (
              <div className="explorer-empty">No matching documents</div>
            ) : (
              filteredDocs.map((doc) => renderDocItem(doc, 0))
            )}
          </div>
        ) : activeTab === 'favorites' ? (
          /* Favorites view */
          <div className="explorer-list">
            {favoriteDocs.length === 0 ? (
              <div className="explorer-empty">No starred documents</div>
            ) : (
              favoriteDocs.map((doc) => renderDocItem(doc, 0))
            )}
          </div>
        ) : activeTab === 'recent' ? (
          /* Recent view */
          <div className="explorer-list">
            {recentDocs.length === 0 ? (
              <div className="explorer-empty">No recent documents</div>
            ) : (
              recentDocs.map((doc) => renderDocItem(doc, 0))
            )}
          </div>
        ) : (
          /* Tree View */
          <div
            className={`explorer-tree ${dropTargetId === 'root' ? 'explorer-tree--drop-root' : ''}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedFolderId(null)
              }
            }}
            onDragOver={(e) => {
              if (draggedItem) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dropTargetId !== 'root') {
                  setDropTargetId('root')
                }
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target && dropTargetId === 'root') {
                setDropTargetId(null)
              }
            }}
            onDrop={async (e) => {
              e.preventDefault()
              setDropTargetId(null)
              const raw = e.dataTransfer.getData('application/x-scratchpad-item')
              if (!raw) return
              try {
                const item = JSON.parse(raw) as { type: 'doc' | 'folder'; id: string }
                if (item.type === 'doc') {
                  await moveDocument(item.id, null)
                } else if (item.type === 'folder') {
                  await moveFolder(item.id, null)
                }
              } catch (err) {
                console.error('Root drop error:', err)
              }
            }}
          >
            {creatingInFolder?.folderId === null && (
              <div className="explorer-row explorer-row--creating" style={{ paddingLeft: '18px' }}>
                {creatingInFolder.type === 'doc' ? <FileText size={15} /> : <FolderIcon size={15} />}
                <input
                  ref={newRef}
                  className="explorer-inline-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={commitCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCreate()
                    if (e.key === 'Escape') setCreatingInFolder(null)
                  }}
                  placeholder={creatingInFolder.type === 'doc' ? 'Document title...' : 'Folder name...'}
                />
              </div>
            )}

            {topLevelFolders.map((f) => renderFolderItem(f, 0))}
            {rootDocs.map((d) => renderDocItem(d, 0))}

            {topLevelFolders.length === 0 && rootDocs.length === 0 && !creatingInFolder && (
              <div className="explorer-empty">
                <p>No documents yet.</p>
                <button
                  id="explorer-empty-new-doc"
                  type="button"
                  className="explorer-empty-btn"
                  onClick={() => createDocument('Untitled', 'rich', null)}
                >
                  Create your first note
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Properties Modal */}
      <DocumentPropertiesModal
        document={propertiesDoc}
        isOpen={!!propertiesDoc}
        onClose={() => setPropertiesDoc(null)}
      />
    </div>
  )
}
