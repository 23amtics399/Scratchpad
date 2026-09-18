import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import type { AttachmentRecord } from '@/types/index.js'

export class AttachmentRepository {
  async getById(id: string): Promise<AttachmentRecord | undefined> {
    return db.attachments.get(id)
  }

  async getByDocument(documentId: string): Promise<AttachmentRecord[]> {
    return db.attachments.where('documentId').equals(documentId).toArray()
  }

  async getAllBlobs(): Promise<{ id: string; blob: Blob; mimeType: string; name: string; documentId: string; type: 'image' | 'file'; size: number; createdAt: number }[]> {
    return db.attachments.toArray()
  }

  async getTotalSize(): Promise<number> {
    const all = await db.attachments.toArray()
    return all.reduce((sum, a) => sum + a.size, 0)
  }

  async getCount(): Promise<number> {
    return db.attachments.count()
  }

  async create(
    documentId: string,
    blob: Blob,
    name: string,
    type: 'image' | 'file' = 'image'
  ): Promise<AttachmentRecord> {
    const record: AttachmentRecord = {
      id: uuidv4(),
      documentId,
      type,
      mimeType: blob.type,
      name,
      size: blob.size,
      blob,
      createdAt: Date.now(),
    }
    await db.attachments.add(record)
    return record
  }

  async delete(id: string): Promise<void> {
    await db.attachments.delete(id)
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const ids = await db.attachments.where('documentId').equals(documentId).primaryKeys()
    await db.attachments.bulkDelete(ids)
  }

  async bulkInsert(records: AttachmentRecord[]): Promise<void> {
    await db.attachments.bulkAdd(records)
  }
}

export const attachmentRepository = new AttachmentRepository()
