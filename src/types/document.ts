// Document type discriminator
export type DocumentType = 'rich' | 'plain' | 'markdown'

// Core document metadata (never contains full content in lists)
export interface DocumentMeta {
  id: string
  workspaceId: string
  folderId: string | null
  title: string
  type: DocumentType
  createdAt: number
  updatedAt: number
  lastOpenedAt: number
  wordCount: number
  characterCount: number
  sortOrder: number
  isFavorite: boolean
  searchText?: string
  tags?: string[]
  deletedAt?: number | null
}

// Full document record (includes content) — only loaded for the active document
export interface DocumentRecord extends DocumentMeta {
  content: string // JSON string for rich, raw text for plain/markdown
  metadata: Record<string, unknown>
}

export interface FolderRecord {
  id: string
  workspaceId: string
  parentId: string | null
  name: string
  createdAt: number
  updatedAt: number
  sortOrder: number
  deletedAt?: number | null
}

export interface WorkspaceRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface AttachmentRecord {
  id: string
  documentId: string
  type: 'image' | 'file'
  mimeType: string
  name: string
  size: number
  blob: Blob
  createdAt: number
}

// Lightweight version stored in backup (no Blob)
export interface AttachmentBackupRecord {
  id: string
  documentId: string
  type: 'image' | 'file'
  mimeType: string
  name: string
  size: number
  dataUrl: string // base64 data URL, only used in backup files
  createdAt: number
}

export interface SnapshotRecord {
  id: string
  documentId: string
  content: string
  label: string
  createdAt: number
}

export interface SettingsRecord {
  id: 'global'
  // Appearance
  theme: 'light' | 'dark' | 'system' | 'one-dark' | 'dracula' | 'nord' | 'monokai' | 'solarized-dark' | 'solarized-light' | 'github-light' | 'github-dark' | 'high-contrast'
  accentColor: string
  uiDensity: 'compact' | 'comfortable' | 'spacious'
  uiScale: number // 75-150
  showAnimations: boolean
  // Editor
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  editorWidth: 'compact' | 'comfortable' | 'wide' | 'full' | 'custom'
  editorWidthCustomPx: number
  sidebarWidth: number
  // Display
  showExplorer: boolean
  showOutline: boolean
  showToolbar: boolean
  showStatusBar: boolean
  showTabs: boolean
  wordWrap: boolean
  spellCheck: boolean
  showLineNumbers: boolean
  zoom: number
  // Documents
  defaultDocumentType: DocumentType
  autosave: boolean
  restoreTabs: boolean
  openLastDocument: boolean
}

// Default settings
export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'global',
  theme: 'system',
  accentColor: '#0066cc',
  uiDensity: 'comfortable',
  uiScale: 100,
  showAnimations: true,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  editorWidth: 'comfortable',
  editorWidthCustomPx: 800,
  sidebarWidth: 270,
  showExplorer: true,
  showOutline: false,
  showToolbar: true,
  showStatusBar: true,
  showTabs: true,
  wordWrap: true,
  spellCheck: true,
  showLineNumbers: false,
  zoom: 100,
  defaultDocumentType: 'rich',
  autosave: true,
  restoreTabs: true,
  openLastDocument: true,
}

// Open tab state
export interface TabRecord {
  documentId: string
  isPinned: boolean
}

// Workspace backup format
export interface WorkspaceBackup {
  format: 'scratchpad-workspace'
  version: 1
  createdAt: string
  workspace: WorkspaceRecord
  folders: FolderRecord[]
  documents: DocumentRecord[]
  attachments: AttachmentBackupRecord[]
  settings?: SettingsRecord
  snapshots?: SnapshotRecord[]
}
