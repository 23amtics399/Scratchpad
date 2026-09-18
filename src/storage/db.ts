import Dexie, { type EntityTable } from 'dexie'
import type {
  WorkspaceRecord,
  FolderRecord,
  DocumentRecord,
  AttachmentRecord,
  SnapshotRecord,
  SettingsRecord,
} from '@/types/index.js'

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------

class ScratchpadDB extends Dexie {
  workspaces!: EntityTable<WorkspaceRecord, 'id'>
  folders!: EntityTable<FolderRecord, 'id'>
  documents!: EntityTable<DocumentRecord, 'id'>
  attachments!: EntityTable<AttachmentRecord, 'id'>
  snapshots!: EntityTable<SnapshotRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'id'>

  constructor() {
    super('ScratchpadDB')

    // Version 1 — initial schema
    this.version(1).stores({
      workspaces: 'id, name, createdAt, updatedAt',
      folders: 'id, workspaceId, parentId, name, sortOrder, createdAt, updatedAt',
      documents:
        'id, workspaceId, folderId, title, type, updatedAt, lastOpenedAt, sortOrder, isFavorite, createdAt',
      attachments: 'id, documentId, type, mimeType, createdAt',
      snapshots: 'id, documentId, createdAt',
      settings: 'id',
    })

    // Version 2 — add deletedAt index to documents and folders for safe deletion / undo
    this.version(2).stores({
      documents:
        'id, workspaceId, folderId, title, type, updatedAt, lastOpenedAt, sortOrder, isFavorite, createdAt, deletedAt',
      folders: 'id, workspaceId, parentId, name, sortOrder, createdAt, updatedAt, deletedAt',
    })
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const db = new ScratchpadDB()

// ---------------------------------------------------------------------------
// Utility: ensure DB is open (call from app init)
// ---------------------------------------------------------------------------

export async function openDB(): Promise<void> {
  await db.open()
}
