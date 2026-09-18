import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { DocumentMeta, FolderRecord, WorkspaceRecord, TabRecord, DocumentType, DocumentRecord } from '@/types/index.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { documentService } from '@/services/DocumentService.js'
import { useToast } from '@/contexts/ToastContext.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkspaceState {
  workspace: WorkspaceRecord | null
  folders: FolderRecord[]
  documents: DocumentMeta[]
  tabs: TabRecord[]
  activeTabId: string | null
  selectedFolderId: string | null
  recentIds: string[]
  isLoading: boolean
  error: string | null
}

interface WorkspaceActions {
  // Documents
  openDocument: (id: string) => void
  createDocument: (title?: string, type?: DocumentType, folderId?: string | null) => Promise<DocumentRecord | null>
  renameDocument: (id: string, title: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  duplicateDocument: (id: string) => Promise<DocumentRecord | null>
  toggleFavorite: (id: string) => Promise<void>
  saveDocumentContent: (id: string, content: string, wordCount: number, characterCount: number) => Promise<void>
  changeDocumentType: (id: string, newType: DocumentType, convertedContent?: string) => Promise<void>
  moveDocument: (id: string, folderId: string | null) => Promise<void>
  // Tabs
  closeTab: (id: string) => void
  closeAllTabs: () => void
  closeOtherTabs: (id: string) => void
  closeTabsToRight: (id: string) => void
  setActiveTab: (id: string) => void
  refreshDocuments: () => Promise<void>
  // Folders
  setSelectedFolderId: (id: string | null) => void
  createFolder: (name: string, parentId?: string | null) => Promise<FolderRecord | null>
  renameFolder: (id: string, name: string) => Promise<void>
  moveFolder: (id: string, newParentId: string | null) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  refreshFolders: () => Promise<void>
  // Workspace
  reload: () => Promise<void>
}

type WorkspaceContextValue = WorkspaceState & WorkspaceActions

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { showToast } = useToast()
  const [state, setState] = useState<WorkspaceState>({
    workspace: null,
    folders: [],
    documents: [],
    tabs: [],
    activeTabId: null,
    selectedFolderId: null,
    recentIds: [],
    isLoading: true,
    error: null,
  })

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  const reload = useCallback(async () => {
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }))
      const workspace = await workspaceService.getOrCreateDefault()
      const [folders, documents] = await Promise.all([
        workspaceService.getFolders(workspace.id),
        workspaceService.getAllDocumentMeta(workspace.id),
      ])
      const recent = await documentService.getRecent(workspace.id)
      setState((s) => ({
        ...s,
        workspace,
        folders,
        documents,
        recentIds: recent.map((d) => d.id),
        isLoading: false,
      }))
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load workspace',
      }))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const refreshDocuments = useCallback(async () => {
    if (!state.workspace) return
    const documents = await workspaceService.getAllDocumentMeta(state.workspace.id)
    const recent = await documentService.getRecent(state.workspace.id)
    setState((s) => ({
      ...s,
      documents,
      recentIds: recent.map((d) => d.id),
    }))
  }, [state.workspace])

  const refreshFolders = useCallback(async () => {
    if (!state.workspace) return
    const folders = await workspaceService.getFolders(state.workspace.id)
    setState((s) => ({ ...s, folders }))
  }, [state.workspace])

  const setSelectedFolderId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedFolderId: id }))
  }, [])

  const openDocument = useCallback((id: string) => {
    setState((s) => {
      // Already open? Just activate.
      if (s.tabs.some((t) => t.documentId === id)) {
        return { ...s, activeTabId: id, selectedFolderId: null }
      }
      // Add new tab
      return {
        ...s,
        tabs: [...s.tabs, { documentId: id, isPinned: false }],
        activeTabId: id,
        selectedFolderId: null,
      }
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setState((s) => {
      const newTabs = s.tabs.filter((t) => t.documentId !== id)
      let newActiveId = s.activeTabId
      if (s.activeTabId === id) {
        // Activate adjacent tab
        const idx = s.tabs.findIndex((t) => t.documentId === id)
        newActiveId = newTabs[idx]?.documentId ?? newTabs[idx - 1]?.documentId ?? null
      }
      return { ...s, tabs: newTabs, activeTabId: newActiveId }
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setState((s) => ({ ...s, tabs: [], activeTabId: null }))
  }, [])

  const closeOtherTabs = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tabs: s.tabs.filter((t) => t.documentId === id),
      activeTabId: id,
    }))
  }, [])

  const closeTabsToRight = useCallback((id: string) => {
    setState((s) => {
      const idx = s.tabs.findIndex((t) => t.documentId === id)
      if (idx === -1) return s
      const newTabs = s.tabs.slice(0, idx + 1)
      let newActiveId = s.activeTabId
      if (!newTabs.some((t) => t.documentId === s.activeTabId)) {
        newActiveId = id
      }
      return { ...s, tabs: newTabs, activeTabId: newActiveId }
    })
  }, [])

  const setActiveTab = useCallback((id: string) => {
    setState((s) => ({ ...s, activeTabId: id }))
  }, [])

  const createDocument = useCallback(
    async (title = 'Untitled', type: DocumentType = 'rich', folderId?: string | null) => {
      if (!state.workspace) return null

      // Deterministic destination folder priority:
      // 1. Explicit argument if passed
      // 2. Explicitly selected folder in Explorer
      // 3. Active document's folderId
      // 4. Workspace root (null)
      let targetFolderId: string | null = null
      if (folderId !== undefined) {
        targetFolderId = folderId
      } else if (state.selectedFolderId && state.folders.some((f) => f.id === state.selectedFolderId)) {
        targetFolderId = state.selectedFolderId
      } else if (state.activeTabId) {
        const activeDoc = state.documents.find((d) => d.id === state.activeTabId)
        if (activeDoc?.folderId && state.folders.some((f) => f.id === activeDoc.folderId)) {
          targetFolderId = activeDoc.folderId
        }
      }

      const doc = await documentService.create(state.workspace.id, type, targetFolderId, title)
      await refreshDocuments()
      openDocument(doc.id)
      setState((s) => ({ ...s, selectedFolderId: null }))
      return doc
    },
    [state.workspace, state.selectedFolderId, state.folders, state.activeTabId, state.documents, refreshDocuments, openDocument]
  )

  const renameDocument = useCallback(
    async (id: string, title: string) => {
      await documentService.rename(id, title)
      await refreshDocuments()
    },
    [refreshDocuments]
  )

  const deleteDocument = useCallback(
    async (id: string) => {
      const doc = state.documents.find((d) => d.id === id)
      closeTab(id)
      await documentService.softDelete(id)
      await refreshDocuments()

      showToast({
        message: `"${doc?.title || 'Document'}" moved to trash`,
        type: 'info',
        durationMs: 7000,
        action: {
          label: 'Undo',
          onClick: async () => {
            await documentService.restore(id)
            await refreshDocuments()
            openDocument(id)
          },
        },
      })

      // Scheduled retention purge (after 15s)
      setTimeout(() => {
        documentService.purgeDeleted(15000).catch(() => {})
      }, 16000)
    },
    [state.documents, closeTab, refreshDocuments, showToast, openDocument]
  )

  const duplicateDocument = useCallback(
    async (id: string) => {
      const copy = await documentService.duplicate(id)
      if (copy) {
        await refreshDocuments()
        openDocument(copy.id)
        showToast({ message: `Duplicated "${copy.title}"`, type: 'success' })
      }
      return copy
    },
    [refreshDocuments, openDocument, showToast]
  )

  const toggleFavorite = useCallback(
    async (id: string) => {
      const doc = state.documents.find((d) => d.id === id)
      if (!doc) return
      await documentService.toggleFavorite(id, !doc.isFavorite)
      await refreshDocuments()
    },
    [state.documents, refreshDocuments]
  )

  const saveDocumentContent = useCallback(
    async (id: string, content: string, wordCount: number, characterCount: number) => {
      await documentService.save(id, content, wordCount, characterCount)
      setState((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id
            ? { ...d, wordCount, characterCount, updatedAt: Date.now() }
            : d
        ),
      }))
    },
    []
  )

  const changeDocumentType = useCallback(
    async (id: string, newType: DocumentType, convertedContent?: string) => {
      await documentService.updateType(id, newType, convertedContent)
      setState((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === id
            ? { ...d, type: newType, updatedAt: Date.now() }
            : d
        ),
      }))
    },
    []
  )

  const moveDocument = useCallback(
    async (id: string, folderId: string | null) => {
      await documentService.move(id, folderId)
      await refreshDocuments()
    },
    [refreshDocuments]
  )

  const createFolder = useCallback(
    async (name: string, parentId: string | null = null) => {
      if (!state.workspace) return null
      const folder = await workspaceService.createFolder(state.workspace.id, name, parentId)
      await refreshFolders()
      return folder
    },
    [state.workspace, refreshFolders]
  )

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      await workspaceService.renameFolder(id, name)
      await refreshFolders()
    },
    [refreshFolders]
  )

  const moveFolder = useCallback(
    async (id: string, newParentId: string | null) => {
      await workspaceService.moveFolder(id, newParentId)
      await refreshFolders()
    },
    [refreshFolders]
  )

  const deleteFolder = useCallback(
    async (id: string) => {
      const folder = state.folders.find((f) => f.id === id)
      const { folderIds, docIds } = await workspaceService.softDeleteFolder(id)
      for (const docId of docIds) {
        closeTab(docId)
      }
      await Promise.all([refreshFolders(), refreshDocuments()])

      showToast({
        message: `Folder "${folder?.name || 'Folder'}" moved to trash`,
        type: 'info',
        durationMs: 7000,
        action: {
          label: 'Undo',
          onClick: async () => {
            await workspaceService.restoreFolder(folderIds, docIds)
            await Promise.all([refreshFolders(), refreshDocuments()])
          },
        },
      })

      // Scheduled retention purge (after 15s)
      setTimeout(() => {
        workspaceService.purgeDeleted(15000).catch(() => {})
      }, 16000)
    },
    [state.folders, closeTab, refreshFolders, refreshDocuments, showToast]
  )

  // ---------------------------------------------------------------------------
  // Value
  // ---------------------------------------------------------------------------

  const value: WorkspaceContextValue = {
    ...state,
    openDocument,
    createDocument,
    renameDocument,
    deleteDocument,
    duplicateDocument,
    toggleFavorite,
    saveDocumentContent,
    changeDocumentType,
    moveDocument,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToRight,
    setActiveTab,
    setSelectedFolderId,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    refreshDocuments,
    refreshFolders,
    reload,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
