import { snapshotRepository, documentRepository } from '@/storage/repositories/index.js'
import type { SnapshotRecord, DocumentRecord } from '@/types/index.js'

export class SnapshotService {
  /**
   * Creates a version snapshot for a document.
   */
  async createSnapshot(
    documentId: string,
    label: string,
    contentOverride?: string
  ): Promise<SnapshotRecord | null> {
    let content = contentOverride
    if (content === undefined) {
      const doc = await documentRepository.getById(documentId)
      if (!doc) return null
      content = doc.content
    }

    return snapshotRepository.create(documentId, content, label || 'Manual snapshot')
  }

  /**
   * Retrieves all snapshots for a document, ordered newest first.
   */
  async getSnapshots(documentId: string): Promise<SnapshotRecord[]> {
    return snapshotRepository.getByDocument(documentId)
  }

  /**
   * Restores a version snapshot with safety snapshot preservation.
   *
   * Crucial Architecture:
   * 1. Creates a safety snapshot of the CURRENT document content before overwriting.
   * 2. Overwrites the document content in local IndexedDB.
   * 3. Dispatches 'scratchpad:reload-document' event to reload the active editor in place.
   * 4. Does NOT reload the browser page, preserving tabs, UI state, and theme.
   */
  async restoreSnapshot(
    documentId: string,
    snapshotId: string
  ): Promise<DocumentRecord | null> {
    const [doc, snapshot] = await Promise.all([
      documentRepository.getById(documentId),
      snapshotRepository.getById(snapshotId),
    ])

    if (!doc || !snapshot) return null

    // 1. Create a safety snapshot of the current state
    const timestampStr = new Date(snapshot.createdAt).toLocaleTimeString()
    const safetyLabel = `Safety backup (before restoring: ${snapshot.label || timestampStr})`
    await snapshotRepository.create(documentId, doc.content, safetyLabel)

    // 2. Persist restored content into the document
    await documentRepository.save(
      documentId,
      snapshot.content,
      doc.wordCount,
      doc.characterCount,
      doc.type
    )

    // 3. Notify the active editor lifecycle to reload in place
    window.dispatchEvent(
      new CustomEvent('scratchpad:reload-document', {
        detail: { documentId, content: snapshot.content },
      })
    )

    return documentRepository.getById(documentId) as Promise<DocumentRecord>
  }

  /**
   * Deletes a specific snapshot.
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await snapshotRepository.delete(snapshotId)
  }
}

export const snapshotService = new SnapshotService()
