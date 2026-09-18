import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { documentRepository } from './DocumentRepository'
import { workspaceRepository } from './WorkspaceRepository'
import { folderRepository } from './FolderRepository'

describe('Storage Repositories', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
  })

  it('creates workspace and queries metadata without loading content', async () => {
    const ws = await workspaceRepository.getOrCreateDefault()
    expect(ws).toBeDefined()
    expect(ws.id).toBeTruthy()

    const doc = await documentRepository.create(
      ws.id,
      'rich',
      null,
      'Test Document'
    )

    // Save actual content into the document
    await documentRepository.save(doc.id, '{"type":"doc","content":[{"type":"paragraph","text":"Sensitive large body"}]}', 3, 20)

    expect(doc.id).toBeTruthy()
    expect(doc.title).toBe('Test Document')

    // Verify metadata-only retrieval does NOT return doc content or plainText
    const metaList = await documentRepository.getAllMeta(ws.id)
    expect(metaList).toHaveLength(1)
    expect(metaList[0].id).toBe(doc.id)
    expect(metaList[0].title).toBe('Test Document')
    // @ts-expect-error Checking that content is omitted in DocumentMeta
    expect(metaList[0].content).toBeUndefined()
  })

  it('supports folder hierarchical operations and document moving', async () => {
    const ws = await workspaceRepository.getOrCreateDefault()
    const parentFolder = await folderRepository.create(ws.id, 'Projects', null)

    const childFolder = await folderRepository.create(ws.id, 'Scratchpad', parentFolder.id)

    const doc = await documentRepository.create(
      ws.id,
      'markdown',
      childFolder.id,
      'Design Specs'
    )

    const docsInFolder = await documentRepository.getByFolder(childFolder.id, ws.id)
    expect(docsInFolder).toHaveLength(1)
    expect(docsInFolder[0].id).toBe(doc.id)

    // Move to parent folder
    await documentRepository.move(doc.id, parentFolder.id)
    const updated = await documentRepository.getById(doc.id)
    expect(updated?.folderId).toBe(parentFolder.id)
  })
})
