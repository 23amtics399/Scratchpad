import { workspaceRepository } from '@/storage/repositories/index.js'
import { folderRepository } from '@/storage/repositories/index.js'
import { documentRepository } from '@/storage/repositories/index.js'
import { attachmentService } from './AttachmentService.js'
import { documentService } from './DocumentService.js'
import { settingsRepository } from '@/storage/repositories/index.js'
import { snapshotRepository } from '@/storage/repositories/index.js'
import { db } from '@/storage/db.js'
import type {
  WorkspaceRecord,
  FolderRecord,
  DocumentMeta,
  WorkspaceBackup,
  AttachmentBackupRecord,
  DocumentRecord,
  AttachmentRecord,
  SnapshotRecord,
} from '@/types/index.js'

// Warning threshold for backup size
const BACKUP_SIZE_WARN_BYTES = 50 * 1024 * 1024

class WorkspaceService {
  // ---------------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------------

  async getOrCreateDefault(): Promise<WorkspaceRecord> {
    return workspaceRepository.getOrCreateDefault()
  }

  async getWorkspace(id: string): Promise<WorkspaceRecord | undefined> {
    return workspaceRepository.getById(id)
  }

  // ---------------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------------

  async getFolders(workspaceId: string): Promise<FolderRecord[]> {
    return folderRepository.getByWorkspace(workspaceId)
  }

  async createFolder(
    workspaceId: string,
    name: string,
    parentId: string | null = null
  ): Promise<FolderRecord> {
    return folderRepository.create(workspaceId, name, parentId)
  }

  async renameFolder(id: string, name: string): Promise<void> {
    return folderRepository.rename(id, name)
  }

  async moveFolder(id: string, newParentId: string | null): Promise<void> {
    return folderRepository.move(id, newParentId)
  }

  /**
   * Delete a folder and all its descendants.
   * Returns the IDs of all deleted documents for UI state cleanup.
   */
  async deleteFolder(id: string): Promise<string[]> {
    const docIds = await folderRepository.deleteRecursive(id)
    for (const docId of docIds) {
      await attachmentService.deleteByDocument(docId)
      await snapshotRepository.deleteByDocument(docId)
    }
    return docIds
  }

  async softDeleteFolder(id: string): Promise<{ folderIds: string[]; docIds: string[] }> {
    return folderRepository.softDeleteRecursive(id)
  }

  async restoreFolder(folderIds: string[], docIds: string[]): Promise<void> {
    return folderRepository.restoreRecursive(folderIds, docIds)
  }

  async purgeDeleted(olderThanMs?: number): Promise<void> {
    await Promise.all([
      folderRepository.purgeDeleted(olderThanMs),
      documentService.purgeDeleted(olderThanMs),
    ])
  }

  // ---------------------------------------------------------------------------
  // Documents (delegated to DocumentService)
  // ---------------------------------------------------------------------------

  async getAllDocumentMeta(workspaceId: string): Promise<DocumentMeta[]> {
    return documentService.getAllMeta(workspaceId)
  }

  // ---------------------------------------------------------------------------
  // Backup
  // ---------------------------------------------------------------------------

  /**
   * Check backup size before generating — returns size info and warning flag.
   */
  async checkBackupSize(): Promise<{ totalBytes: number; exceedsWarningThreshold: boolean }> {
    return attachmentService.checkBackupSize()
  }

  /**
   * Generate a full workspace backup.
   * Attachments are serialized one at a time to avoid OOM.
   *
   * @param workspaceId The workspace to back up
   * @param includeAttachments Whether to serialize attachment blobs
   * @param onProgress Optional progress callback (current, total)
   */
  async generateBackup(
    workspaceId: string,
    includeAttachments = true,
    onProgress?: (current: number, total: number) => void
  ): Promise<WorkspaceBackup> {
    const [workspace, folders, documents, settings] = await Promise.all([
      workspaceRepository.getById(workspaceId),
      folderRepository.getByWorkspace(workspaceId),
      documentRepository.getAllMeta(workspaceId),
      settingsRepository.get(),
    ])

    if (!workspace) throw new Error('Workspace not found')

    // Load full content for each document
    const fullDocuments: DocumentRecord[] = []
    for (const meta of documents) {
      const doc = await documentRepository.getById(meta.id)
      if (doc) fullDocuments.push(doc)
    }

    // Serialize attachments one at a time
    const attachmentBackups: AttachmentBackupRecord[] = []
    if (includeAttachments) {
      // Collect all attachment records
      const allAttachments: AttachmentRecord[] = []
      for (const doc of fullDocuments) {
        const docAttachments = await attachmentService.getByDocument(doc.id)
        allAttachments.push(...docAttachments)
      }

      const total = allAttachments.length
      for (let i = 0; i < total; i++) {
        const att = allAttachments[i]
        onProgress?.(i + 1, total)
        const serialized = await attachmentService.serializeForBackup(att.id)
        if (serialized) {
          attachmentBackups.push({
            id: att.id,
            documentId: att.documentId,
            type: att.type,
            mimeType: att.mimeType,
            name: att.name,
            size: att.size,
            dataUrl: serialized.dataUrl,
            createdAt: att.createdAt,
          })
        }
      }
    }

    // Collect snapshots for all documents
    const allSnapshots: SnapshotRecord[] = []
    for (const doc of fullDocuments) {
      const docSnapshots = await snapshotRepository.getByDocument(doc.id)
      allSnapshots.push(...docSnapshots)
    }

    const backup: WorkspaceBackup = {
      format: 'scratchpad-workspace',
      version: 1,
      createdAt: new Date().toISOString(),
      workspace,
      folders,
      documents: fullDocuments,
      attachments: attachmentBackups,
      settings,
      snapshots: allSnapshots,
    }

    return backup
  }

  /**
   * Validate a backup file structure.
   * Returns true if the backup appears valid for this version.
   */
  validateBackup(backup: unknown): backup is WorkspaceBackup {
    if (!backup || typeof backup !== 'object') return false
    const b = backup as Record<string, unknown>
    return (
      b.format === 'scratchpad-workspace' &&
      typeof b.version === 'number' &&
      b.version >= 1 &&
      Array.isArray(b.documents) &&
      Array.isArray(b.folders)
    )
  }

  /**
   * Restore a workspace backup.
   *
   * @param backup Validated backup object
   * @param mode 'replace' — clears existing workspace first; 'merge' — adds to existing
   */
  async restoreBackup(
    backup: WorkspaceBackup,
    targetWorkspaceId: string,
    mode: 'replace' | 'merge'
  ): Promise<void> {
    if (mode === 'replace') {
      // Delete existing documents (and their attachments/snapshots)
      const existingDocs = await documentRepository.getAllMeta(targetWorkspaceId)
      for (const doc of existingDocs) {
        await documentService.delete(doc.id)
      }
      // Delete existing folders
      const existingFolders = await folderRepository.getByWorkspace(targetWorkspaceId)
      for (const folder of existingFolders) {
        await folderRepository.deleteRecursive(folder.id)
      }
    }

    // Restore folders preserving exact IDs
    const foldersToInsert: FolderRecord[] = []
    for (const folder of backup.folders) {
      const existing = mode === 'merge' ? await folderRepository.getById(folder.id) : null
      if (!existing) {
        foldersToInsert.push({ ...folder, workspaceId: targetWorkspaceId })
      }
    }
    if (foldersToInsert.length > 0) {
      await folderRepository.bulkInsert(foldersToInsert)
    }

    // Restore documents
    for (const doc of backup.documents) {
      const existing = mode === 'merge' ? await documentRepository.getById(doc.id) : null
      if (!existing) {
        await documentRepository.bulkInsert([{ ...doc, workspaceId: targetWorkspaceId }])
      }
    }

    // Restore attachments (one at a time)
    for (const att of backup.attachments) {
      if (!att.dataUrl) continue
      await attachmentService.restoreFromBackup(
        att.id,
        att.documentId,
        att.dataUrl,
        att.name,
        att.mimeType,
        att.type,
        att.createdAt
      )
    }

    // Restore snapshots
    if (backup.snapshots && Array.isArray(backup.snapshots)) {
      for (const snap of backup.snapshots) {
        const existing = mode === 'merge' ? await snapshotRepository.getById(snap.id) : null
        if (!existing) {
          await db.snapshots.put(snap)
        }
      }
    }

    // Restore settings if present (replace mode only)
    if (mode === 'replace' && backup.settings) {
      await settingsRepository.save(backup.settings)
    }
  }

  // ---------------------------------------------------------------------------
  // Storage info
  // ---------------------------------------------------------------------------

  async getStorageInfo(workspaceId: string): Promise<{
    documentCount: number
    attachmentCount: number
    estimatedBytes: number
    snapshotCount: number
  }> {
    const [docs, attCount, attBytes] = await Promise.all([
      documentRepository.getAllMeta(workspaceId),
      attachmentService.getCount(),
      attachmentService.getTotalSize(),
    ])

    // Estimate snapshot count
    let snapshotCount = 0
    for (const doc of docs) {
      snapshotCount += await snapshotRepository.getCount(doc.id)
    }

    return {
      documentCount: docs.length,
      attachmentCount: attCount,
      estimatedBytes: attBytes,
      snapshotCount,
    }
  }
}

export const workspaceService = new WorkspaceService()
export { BACKUP_SIZE_WARN_BYTES }
