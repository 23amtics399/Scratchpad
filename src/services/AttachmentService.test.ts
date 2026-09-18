import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attachmentService } from './AttachmentService'
import { attachmentRepository } from '@/storage/repositories/index'
import { db } from '@/storage/db'

describe('AttachmentService', () => {
  beforeEach(async () => {
    await db.attachments.clear()
    attachmentService.revokeAll()
    vi.clearAllMocks()
  })

  it('stores attachments and resolves cached object URLs', async () => {
    const blob = new Blob(['sample-image-data'], { type: 'image/png' })
    const record = await attachmentService.store('doc-1', blob, 'sample.png', 'image')
    expect(record.id).toBeTruthy()
    expect(record.name).toBe('sample.png')

    // First resolution loads from DB and caches URL
    const url1 = await attachmentService.resolve(record.id)
    expect(url1).toBeTruthy()
    expect(attachmentService.resolveSync(record.id)).toBe(url1)

    // Second resolution returns the cached URL
    const url2 = await attachmentService.resolve(record.id)
    expect(url2).toBe(url1)
  })

  it('tracks reference count and revokes when count reaches 0', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const blob = new Blob(['sample-image-data'], { type: 'image/png' })
    const record = await attachmentService.store('doc-2', blob, 'image2.png', 'image')

    await attachmentService.resolve(record.id) // refCount = 1
    await attachmentService.resolve(record.id) // refCount = 2

    attachmentService.release(record.id) // refCount = 1
    expect(attachmentService.resolveSync(record.id)).toBeTruthy()
    expect(revokeSpy).not.toHaveBeenCalled()

    attachmentService.release(record.id) // refCount = 0 -> revokes
    expect(attachmentService.resolveSync(record.id)).toBeNull()
    expect(revokeSpy).toHaveBeenCalled()
  })

  it('revokes all cached URLs upon revokeAll', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const blob1 = new Blob(['data1'], { type: 'image/png' })
    const blob2 = new Blob(['data2'], { type: 'image/png' })

    const rec1 = await attachmentService.store('doc-a', blob1, 'a.png', 'image')
    const rec2 = await attachmentService.store('doc-b', blob2, 'b.png', 'image')

    await attachmentService.resolve(rec1.id)
    await attachmentService.resolve(rec2.id)

    expect(attachmentService.resolveSync(rec1.id)).toBeTruthy()
    expect(attachmentService.resolveSync(rec2.id)).toBeTruthy()

    attachmentService.revokeAll()

    expect(attachmentService.resolveSync(rec1.id)).toBeNull()
    expect(attachmentService.resolveSync(rec2.id)).toBeNull()
    expect(revokeSpy).toHaveBeenCalledTimes(2)
  })

  it('serializes and restores attachments for backup', async () => {
    const blob = new Blob(['Hello Scratchpad Backup'], { type: 'text/plain' })
    const record = await attachmentService.store('doc-c', blob, 'notes.txt', 'file')

    const serialized = await attachmentService.serializeForBackup(record.id)
    expect(serialized).not.toBeNull()
    expect(serialized?.id).toBe(record.id)
    expect(serialized?.dataUrl).toContain('data:text/plain;base64,')

    // Clean DB and restore
    await db.attachments.clear()
    expect(await attachmentRepository.getById(record.id)).toBeUndefined()

    await attachmentService.restoreFromBackup(
      record.id,
      'doc-c',
      serialized!.dataUrl,
      record.name,
      record.mimeType,
      record.type,
      record.createdAt
    )

    const restored = await attachmentRepository.getById(record.id)
    expect(restored).toBeDefined()
    expect(restored?.name).toBe('notes.txt')
  })
})
