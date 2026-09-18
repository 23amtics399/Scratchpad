import { documentRepository } from '@/storage/repositories/index.js'
import { snapshotRepository } from '@/storage/repositories/index.js'
import { db } from '@/storage/db.js'
import { attachmentService } from './AttachmentService.js'
import type { DocumentRecord, DocumentMeta, DocumentType } from '@/types/index.js'

/**
 * DocumentService — business logic layer above DocumentRepository.
 * The UI only calls DocumentService; it never calls DocumentRepository directly.
 */
class DocumentService {
  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async getAllMeta(workspaceId: string): Promise<DocumentMeta[]> {
    return documentRepository.getAllMeta(workspaceId)
  }

  async getByFolder(folderId: string | null, workspaceId: string): Promise<DocumentMeta[]> {
    return documentRepository.getByFolder(folderId, workspaceId)
  }

  async getById(id: string): Promise<DocumentRecord | undefined> {
    return documentRepository.getById(id)
  }

  async getRecent(workspaceId: string, limit?: number): Promise<DocumentMeta[]> {
    return documentRepository.getRecent(workspaceId, limit)
  }

  async getFavorites(workspaceId: string): Promise<DocumentMeta[]> {
    return documentRepository.getFavorites(workspaceId)
  }

  async search(workspaceId: string, query: string): Promise<DocumentMeta[]> {
    return documentRepository.search(workspaceId, query)
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    workspaceId: string,
    type: DocumentType = 'rich',
    folderId: string | null = null,
    title = 'Untitled'
  ): Promise<DocumentRecord> {
    return documentRepository.create(workspaceId, type, folderId, title)
  }

  // ---------------------------------------------------------------------------
  // Save (autosave + manual)
  // ---------------------------------------------------------------------------

  async save(
    id: string,
    content: string,
    wordCount: number,
    characterCount: number
  ): Promise<void> {
    await documentRepository.save(id, content, wordCount, characterCount)
  }

  async updateType(id: string, type: DocumentType, content?: string): Promise<void> {
    await documentRepository.updateType(id, type, content)
  }

  // ---------------------------------------------------------------------------
  // Open
  // ---------------------------------------------------------------------------

  async open(id: string): Promise<DocumentRecord | null> {
    const doc = await documentRepository.getById(id)
    if (!doc) return null
    await documentRepository.updateLastOpened(id)
    return doc
  }

  // ---------------------------------------------------------------------------
  // Rename
  // ---------------------------------------------------------------------------

  async rename(id: string, title: string): Promise<void> {
    await documentRepository.rename(id, title)
  }

  // ---------------------------------------------------------------------------
  // Move
  // ---------------------------------------------------------------------------

  async move(id: string, folderId: string | null): Promise<void> {
    await documentRepository.move(id, folderId)
  }

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  async duplicate(id: string): Promise<DocumentRecord | null> {
    return documentRepository.duplicate(id)
  }

  // ---------------------------------------------------------------------------
  // Toggle favorite
  // ---------------------------------------------------------------------------

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await documentRepository.toggleFavorite(id, isFavorite)
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async softDelete(id: string): Promise<void> {
    await documentRepository.softDelete(id)
  }

  async restore(id: string): Promise<void> {
    await documentRepository.restore(id)
  }

  async purgeDeleted(olderThanMs = 15000): Promise<void> {
    const threshold = Date.now() - olderThanMs
    const all = await db.documents.toArray()
    const toDelete = all.filter((d) => d.deletedAt && d.deletedAt <= threshold).map((d) => d.id)
    for (const id of toDelete) {
      await attachmentService.deleteByDocument(id)
      await snapshotRepository.deleteByDocument(id)
    }
    await documentRepository.purgeDeleted(olderThanMs)
  }

  async delete(id: string): Promise<void> {
    // Clean up attachments and their cached object URLs
    await attachmentService.deleteByDocument(id)
    // Delete version snapshots
    await snapshotRepository.deleteByDocument(id)
    // Delete the document
    await documentRepository.delete(id)
  }

  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id)
    }
  }

  // ---------------------------------------------------------------------------
  // Version snapshots
  // ---------------------------------------------------------------------------

  async createSnapshot(id: string, content: string, label = ''): Promise<void> {
    await snapshotRepository.create(id, content, label)
  }

  async getSnapshots(id: string) {
    return snapshotRepository.getByDocument(id)
  }

  async restoreSnapshot(documentId: string, snapshotId: string): Promise<DocumentRecord | null> {
    const [doc, snapshot] = await Promise.all([
      documentRepository.getById(documentId),
      snapshotRepository.getById(snapshotId),
    ])

    if (!doc || !snapshot) return null

    // Save current version as a snapshot before restoring
    await snapshotRepository.create(documentId, doc.content, 'Before restore')

    // Restore snapshot content
    await documentRepository.save(documentId, snapshot.content, 0, 0)
    const restored = await documentRepository.getById(documentId)
    return restored ?? null
  }
}

export const documentService = new DocumentService()
