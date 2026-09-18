import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import type { FolderRecord } from '@/types/index.js'

export class FolderRepository {
  async getByWorkspace(workspaceId: string): Promise<FolderRecord[]> {
    const folders = await db.folders.where('workspaceId').equals(workspaceId).sortBy('sortOrder')
    return folders.filter((f) => !f.deletedAt)
  }

  async getById(id: string): Promise<FolderRecord | undefined> {
    return db.folders.get(id)
  }

  async getChildren(parentId: string): Promise<FolderRecord[]> {
    const children = await db.folders.where('parentId').equals(parentId).sortBy('sortOrder')
    return children.filter((f) => !f.deletedAt)
  }

  async getTopLevel(workspaceId: string): Promise<FolderRecord[]> {
    const all = await this.getByWorkspace(workspaceId)
    return all.filter((f) => f.parentId === null && !f.deletedAt)
  }

  async create(
    workspaceId: string,
    name: string,
    parentId: string | null = null
  ): Promise<FolderRecord> {
    const now = Date.now()
    // Get max sort order among siblings
    const siblings = parentId
      ? await this.getChildren(parentId)
      : await this.getTopLevel(workspaceId)
    const maxSort = siblings.reduce((max, f) => Math.max(max, f.sortOrder), -1)

    const folder: FolderRecord = {
      id: uuidv4(),
      workspaceId,
      parentId,
      name,
      createdAt: now,
      updatedAt: now,
      sortOrder: maxSort + 1,
    }
    await db.folders.add(folder)
    return folder
  }

  async rename(id: string, name: string): Promise<void> {
    await db.folders.update(id, { name, updatedAt: Date.now() })
  }

  async move(id: string, newParentId: string | null): Promise<void> {
    await db.folders.update(id, { parentId: newParentId, updatedAt: Date.now() })
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    await db.folders.update(id, { sortOrder })
  }

  async bulkInsert(folders: FolderRecord[]): Promise<void> {
    await db.folders.bulkAdd(folders)
  }

  async softDelete(id: string): Promise<void> {
    await db.folders.update(id, { deletedAt: Date.now() })
  }

  async restore(id: string): Promise<void> {
    await db.folders.update(id, { deletedAt: null })
  }

  /**
   * Soft-delete a folder and all its descendants (subfolders and documents).
   * Returns the IDs of all soft-deleted items so Undo can restore them all.
   */
  async softDeleteRecursive(id: string): Promise<{ folderIds: string[]; docIds: string[] }> {
    const folderIds: string[] = []
    const docIds: string[] = []
    const now = Date.now()

    const collectAndMark = async (folderId: string): Promise<void> => {
      folderIds.push(folderId)

      // Documents in folder
      const docs = await db.documents.where('folderId').equals(folderId).toArray()
      for (const d of docs) {
        if (!d.deletedAt) {
          docIds.push(d.id)
        }
      }

      // Sub-folders
      const children = await db.folders.where('parentId').equals(folderId).toArray()
      for (const child of children) {
        if (!child.deletedAt) {
          await collectAndMark(child.id)
        }
      }
    }

    await collectAndMark(id)

    // Mark deletedAt on all collected folders and docs
    await Promise.all([
      ...folderIds.map((fId) => db.folders.update(fId, { deletedAt: now })),
      ...docIds.map((dId) => db.documents.update(dId, { deletedAt: now })),
    ])

    return { folderIds, docIds }
  }

  /**
   * Restore a soft-deleted folder subtree (folders and documents).
   */
  async restoreRecursive(folderIds: string[], docIds: string[]): Promise<void> {
    await Promise.all([
      ...folderIds.map((fId) => db.folders.update(fId, { deletedAt: null })),
      ...docIds.map((dId) => db.documents.update(dId, { deletedAt: null })),
    ])
  }

  async purgeDeleted(olderThanMs = 15000): Promise<void> {
    const threshold = Date.now() - olderThanMs
    const all = await db.folders.toArray()
    const toDelete = all.filter((f) => f.deletedAt && f.deletedAt <= threshold).map((f) => f.id)
    if (toDelete.length > 0) {
      await db.folders.bulkDelete(toDelete)
    }
  }

  /**
   * Hard-delete a folder and all its descendants.
   */
  async deleteRecursive(id: string): Promise<string[]> {
    const deletedDocIds: string[] = []

    const collectAndDelete = async (folderId: string): Promise<void> => {
      const docs = await db.documents.where('folderId').equals(folderId).primaryKeys()
      deletedDocIds.push(...(docs as string[]))
      await db.documents.bulkDelete(docs)

      const children = await db.folders.where('parentId').equals(folderId).primaryKeys()
      for (const childId of children as string[]) {
        await collectAndDelete(childId)
      }

      await db.folders.delete(folderId)
    }

    await collectAndDelete(id)
    return deletedDocIds
  }
}

export const folderRepository = new FolderRepository()
