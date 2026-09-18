import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import type { SnapshotRecord } from '@/types/index.js'

// How many snapshots to retain per document before pruning
const MAX_SNAPSHOTS_PER_DOCUMENT = 50

export class SnapshotRepository {
  private lastCreatedAt = 0

  async getByDocument(documentId: string): Promise<SnapshotRecord[]> {
    return db.snapshots.where('documentId').equals(documentId).reverse().sortBy('createdAt')
  }

  async getById(id: string): Promise<SnapshotRecord | undefined> {
    return db.snapshots.get(id)
  }

  async getCount(documentId: string): Promise<number> {
    return db.snapshots.where('documentId').equals(documentId).count()
  }

  async create(documentId: string, content: string, label = ''): Promise<SnapshotRecord> {
    const now = Date.now()
    const createdAt = now > this.lastCreatedAt ? now : this.lastCreatedAt + 1
    this.lastCreatedAt = createdAt

    const snapshot: SnapshotRecord = {
      id: uuidv4(),
      documentId,
      content,
      label,
      createdAt,
    }
    await db.snapshots.add(snapshot)

    // Prune old snapshots to stay within limit
    await this.prune(documentId)

    return snapshot
  }

  async delete(id: string): Promise<void> {
    await db.snapshots.delete(id)
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const ids = await db.snapshots.where('documentId').equals(documentId).primaryKeys()
    await db.snapshots.bulkDelete(ids)
  }

  async bulkInsert(records: SnapshotRecord[]): Promise<void> {
    await db.snapshots.bulkAdd(records)
  }

  /** Prune oldest snapshots beyond the max limit */
  private async prune(documentId: string): Promise<void> {
    const all = await db.snapshots
      .where('documentId')
      .equals(documentId)
      .sortBy('createdAt')

    if (all.length > MAX_SNAPSHOTS_PER_DOCUMENT) {
      const toDelete = all.slice(0, all.length - MAX_SNAPSHOTS_PER_DOCUMENT)
      await db.snapshots.bulkDelete(toDelete.map((s) => s.id))
    }
  }
}

export const snapshotRepository = new SnapshotRepository()
