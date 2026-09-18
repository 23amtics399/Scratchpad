import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import type { DocumentRecord, DocumentMeta, DocumentType } from '@/types/index.js'
import { extractSearchableText } from '@/utils/textExtractor.js'

const RECENT_LIMIT = 20

export class DocumentRepository {
  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async getById(id: string): Promise<DocumentRecord | undefined> {
    return db.documents.get(id)
  }

  /** Returns metadata for all documents in a workspace (no full content) */
  async getAllMeta(workspaceId: string): Promise<DocumentMeta[]> {
    const docs = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .sortBy('sortOrder')

    return docs.filter((d) => !d.deletedAt).map((d) => this.#stripContent(d))
  }

  /** Returns metadata for documents in a specific folder */
  async getByFolder(folderId: string | null, workspaceId: string): Promise<DocumentMeta[]> {
    let docs: DocumentRecord[]
    if (folderId === null) {
      // Root-level documents (no folder)
      const all = await db.documents.where('workspaceId').equals(workspaceId).toArray()
      docs = all.filter((d) => d.folderId === null && !d.deletedAt)
    } else {
      const folderDocs = await db.documents.where('folderId').equals(folderId).toArray()
      docs = folderDocs.filter((d) => !d.deletedAt)
    }
    docs.sort((a, b) => a.sortOrder - b.sortOrder)
    return docs.map((d) => this.#stripContent(d))
  }

  /** Returns recent documents (sorted by lastOpenedAt desc) */
  async getRecent(workspaceId: string, limit = RECENT_LIMIT): Promise<DocumentMeta[]> {
    const docs = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .reverse()
      .sortBy('lastOpenedAt')
    return docs
      .filter((d) => !d.deletedAt)
      .slice(0, limit)
      .map((d) => this.#stripContent(d))
  }

  /** Returns favorite documents */
  async getFavorites(workspaceId: string): Promise<DocumentMeta[]> {
    const all = await db.documents.where('workspaceId').equals(workspaceId).toArray()
    return all.filter((d) => d.isFavorite && !d.deletedAt).map((d) => this.#stripContent(d))
  }

  /**
   * Search across document titles, derived searchText, and tags.
   * Does NOT search raw Tiptap JSON or load full document trees into React.
   */
  async search(workspaceId: string, query: string): Promise<DocumentMeta[]> {
    const lower = query.toLowerCase().trim()
    if (!lower) return []
    const all = await db.documents.where('workspaceId').equals(workspaceId).toArray()
    const matches = all.filter((d) => {
      if (d.deletedAt) return false
      const titleMatch = d.title.toLowerCase().includes(lower)
      const textMatch = d.searchText ? d.searchText.toLowerCase().includes(lower) : false
      const tagMatch = Array.isArray(d.tags) && d.tags.some((t) => t.toLowerCase().includes(lower))
      return titleMatch || textMatch || tagMatch
    })
    return matches.map((d) => this.#stripContent(d))
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async create(
    workspaceId: string,
    type: DocumentType = 'rich',
    folderId: string | null = null,
    title = 'Untitled'
  ): Promise<DocumentRecord> {
    const now = Date.now()

    // Get next sort order in folder
    const siblings = folderId
      ? await db.documents.where('folderId').equals(folderId).toArray()
      : (await db.documents.where('workspaceId').equals(workspaceId).toArray()).filter(
          (d) => d.folderId === null
        )
    const maxSort = siblings.reduce((max, d) => Math.max(max, d.sortOrder), -1)

    const emptyContent = type === 'rich' ? '{"type":"doc","content":[{"type":"paragraph"}]}' : ''
    const searchText = extractSearchableText(emptyContent, type)

    const doc: DocumentRecord = {
      id: uuidv4(),
      workspaceId,
      folderId,
      title,
      type,
      content: emptyContent,
      searchText,
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      wordCount: 0,
      characterCount: 0,
      sortOrder: maxSort + 1,
      isFavorite: false,
      metadata: {},
    }

    await db.documents.add(doc)
    return doc
  }

  async save(
    id: string,
    content: string,
    wordCount: number,
    characterCount: number,
    type?: DocumentType
  ): Promise<void> {
    let docType = type
    if (!docType) {
      const existing = await db.documents.get(id)
      docType = existing?.type || 'rich'
    }
    const searchText = extractSearchableText(content, docType)

    await db.documents.update(id, {
      content,
      searchText,
      wordCount,
      characterCount,
      updatedAt: Date.now(),
    })
  }

  async updateType(id: string, type: DocumentType, content?: string): Promise<void> {
    const patch: Partial<DocumentRecord> = { type, updatedAt: Date.now() }
    if (content !== undefined) {
      patch.content = content
      patch.searchText = extractSearchableText(content, type)
    } else {
      const existing = await db.documents.get(id)
      if (existing) {
        patch.searchText = extractSearchableText(existing.content, type)
      }
    }
    await db.documents.update(id, patch)
  }

  async rename(id: string, title: string): Promise<void> {
    await db.documents.update(id, { title: title.trim() || 'Untitled', updatedAt: Date.now() })
  }

  async updateLastOpened(id: string): Promise<void> {
    await db.documents.update(id, { lastOpenedAt: Date.now() })
  }

  async setTags(id: string, tags: string[]): Promise<void> {
    await db.documents.update(id, { tags, updatedAt: Date.now() })
  }

  async move(id: string, folderId: string | null): Promise<void> {
    await db.documents.update(id, { folderId, updatedAt: Date.now() })
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await db.documents.update(id, { sortOrder })
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await db.documents.update(id, { isFavorite })
  }

  async duplicate(id: string): Promise<DocumentRecord | null> {
    const source = await db.documents.get(id)
    if (!source) return null

    const now = Date.now()
    const copy: DocumentRecord = {
      ...source,
      id: uuidv4(),
      title: `${source.title} copy`,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      sortOrder: source.sortOrder + 0.5, // will be normalized later
    }
    await db.documents.add(copy)
    return copy
  }

  async softDelete(id: string): Promise<void> {
    await db.documents.update(id, { deletedAt: Date.now() })
  }

  async restore(id: string): Promise<void> {
    await db.documents.update(id, { deletedAt: null })
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    const now = Date.now()
    await Promise.all(ids.map((id) => db.documents.update(id, { deletedAt: now })))
  }

  async restoreMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => db.documents.update(id, { deletedAt: null })))
  }

  async purgeDeleted(olderThanMs = 15000): Promise<void> {
    const threshold = Date.now() - olderThanMs
    const all = await db.documents.toArray()
    const toDelete = all.filter((d) => d.deletedAt && d.deletedAt <= threshold).map((d) => d.id)
    if (toDelete.length > 0) {
      await db.documents.bulkDelete(toDelete)
    }
  }

  async delete(id: string): Promise<void> {
    await db.documents.delete(id)
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await db.documents.bulkDelete(ids)
  }

  async bulkInsert(docs: DocumentRecord[]): Promise<void> {
    await db.documents.bulkAdd(docs)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  #stripContent(doc: DocumentRecord): DocumentMeta {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content: _content, metadata: _metadata, ...meta } = doc
    return meta
  }
}

export const documentRepository = new DocumentRepository()
