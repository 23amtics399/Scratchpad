import { attachmentRepository } from '@/storage/repositories/index.js'
import type { AttachmentRecord } from '@/types/index.js'
import { optimizeImage } from '@/utils/imageOptimizer.js'

// Size warning threshold (50 MB)
const BACKUP_WARNING_THRESHOLD_BYTES = 50 * 1024 * 1024

/**
 * AttachmentService manages the full lifecycle of image/file attachments:
 *
 * - Persists blobs to IndexedDB via AttachmentRepository
 * - Maintains an in-memory object URL cache so the editor never makes
 *   repeated IndexedDB reads for the same blob during rendering
 * - Tracks all issued object URLs and revokes them when no longer needed
 * - Provides backup helpers with streaming serialization
 *
 * This is a singleton service — do not instantiate multiple copies.
 */
export class AttachmentService {
  // Map<attachmentId → objectURL>
  private readonly urlCache = new Map<string, string>()
  // Map<attachmentId → reference count (how many renders are using this URL)>
  private readonly refCount = new Map<string, number>()

  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------

  /**
   * Store an attachment blob in IndexedDB and return its record.
   * Runs client-side optimization on large images before persisting.
   * Does NOT automatically create an object URL — call resolve() when needed.
   */
  async store(
    documentId: string,
    blob: Blob,
    name: string,
    type: 'image' | 'file' = 'image',
    shouldOptimize = true
  ): Promise<AttachmentRecord> {
    let finalBlob = blob
    if (type === 'image' && shouldOptimize) {
      try {
        const opt = await optimizeImage(blob, name)
        finalBlob = opt.blob
      } catch (err) {
        console.warn('Image optimization skipped:', err)
      }
    }
    return attachmentRepository.create(documentId, finalBlob, name, type)
  }

  // ---------------------------------------------------------------------------
  // Resolve (cached object URL)
  // ---------------------------------------------------------------------------

  /**
   * Returns a stable object URL for an attachment.
   * Caches the result — subsequent calls return the same URL without a DB read.
   */
  async resolve(attachmentId: string): Promise<string | null> {
    // Cache hit
    const cached = this.urlCache.get(attachmentId)
    if (cached) {
      this.refCount.set(attachmentId, (this.refCount.get(attachmentId) ?? 0) + 1)
      return cached
    }

    // Cache miss — load from IndexedDB
    const record = await attachmentRepository.getById(attachmentId)
    if (!record) return null

    const url = URL.createObjectURL(record.blob)
    this.urlCache.set(attachmentId, url)
    this.refCount.set(attachmentId, 1)
    return url
  }

  /**
   * Synchronously returns a cached URL without a DB read.
   * Returns null if the URL isn't cached yet.
   */
  resolveSync(attachmentId: string): string | null {
    return this.urlCache.get(attachmentId) ?? null
  }

  // ---------------------------------------------------------------------------
  // Release
  // ---------------------------------------------------------------------------

  /**
   * Release one reference to an attachment's object URL.
   * When the reference count reaches zero, the object URL is revoked.
   */
  release(attachmentId: string): void {
    const count = this.refCount.get(attachmentId) ?? 0
    if (count <= 1) {
      this.revoke(attachmentId)
    } else {
      this.refCount.set(attachmentId, count - 1)
    }
  }

  /**
   * Force-revoke an object URL regardless of reference count.
   * Call this when an attachment is deleted.
   */
  revoke(attachmentId: string): void {
    const url = this.urlCache.get(attachmentId)
    if (url) {
      URL.revokeObjectURL(url)
      this.urlCache.delete(attachmentId)
      this.refCount.delete(attachmentId)
    }
  }

  /**
   * Revoke all cached object URLs for a specific document.
   * Call this when closing a document that had images.
   */
  async revokeForDocument(documentId: string): Promise<void> {
    const attachments = await attachmentRepository.getByDocument(documentId)
    for (const a of attachments) {
      this.revoke(a.id)
    }
  }

  /**
   * Revoke ALL cached object URLs. Call on application teardown.
   */
  revokeAll(): void {
    for (const [id] of this.urlCache) {
      this.revoke(id)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async delete(attachmentId: string): Promise<void> {
    this.revoke(attachmentId)
    await attachmentRepository.delete(attachmentId)
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.revokeForDocument(documentId)
    await attachmentRepository.deleteByDocument(documentId)
  }

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  async getById(id: string): Promise<AttachmentRecord | undefined> {
    return attachmentRepository.getById(id)
  }

  async getByDocument(documentId: string): Promise<AttachmentRecord[]> {
    return attachmentRepository.getByDocument(documentId)
  }

  async getTotalSize(): Promise<number> {
    return attachmentRepository.getTotalSize()
  }

  async getCount(): Promise<number> {
    return attachmentRepository.getCount()
  }

  // ---------------------------------------------------------------------------
  // Backup helpers
  // ---------------------------------------------------------------------------

  /**
   * Check total attachment size before backup.
   * Returns { totalBytes, exceedsWarningThreshold }.
   */
  async checkBackupSize(): Promise<{ totalBytes: number; exceedsWarningThreshold: boolean }> {
    const totalBytes = await attachmentRepository.getTotalSize()
    return {
      totalBytes,
      exceedsWarningThreshold: totalBytes > BACKUP_WARNING_THRESHOLD_BYTES,
    }
  }

  /**
   * Serialize a single attachment blob to a base64 data URL.
   * Returns null if the attachment doesn't exist.
   * Process attachments one at a time during backup — do NOT call this concurrently.
   */
  async serializeForBackup(
    attachmentId: string
  ): Promise<{ id: string; dataUrl: string } | null> {
    const record = await attachmentRepository.getById(attachmentId)
    if (!record) return null

    const dataUrl = await blobToDataUrl(record.blob)
    return { id: attachmentId, dataUrl }
  }

  /**
   * Restore an attachment from a backup data URL.
   */
  async restoreFromBackup(
    id: string,
    documentId: string,
    dataUrl: string,
    name: string,
    mimeType: string,
    type: 'image' | 'file',
    createdAt: number
  ): Promise<void> {
    const blob = dataUrlToBlob(dataUrl, mimeType)
    const record: AttachmentRecord = {
      id,
      documentId,
      type,
      mimeType,
      name,
      size: blob.size,
      blob,
      createdAt,
    }
    await attachmentRepository.bulkInsert([record])
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof blob?.arrayBuffer === 'function') {
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return `data:${blob.type || 'application/octet-stream'};base64,${base64}`
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const [, base64] = dataUrl.split(',')
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mimeType })
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const attachmentService = new AttachmentService()
