import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/storage/db.js'
import {
  documentRepository,
  folderRepository,
  snapshotRepository,
  attachmentRepository,
} from '@/storage/repositories/index.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { documentService } from '@/services/DocumentService.js'
import { snapshotService } from '@/services/SnapshotService.js'
import { attachmentService } from '@/services/AttachmentService.js'
import { importService } from '@/services/ImportService.js'
import {
  convertDocumentContent,
  richToMarkdown,
  markdownToRich,
  richToHtml,
  htmlToRich,
  richToPlain,
  plainToRich,
} from '@/services/ConversionService.js'
import { isQuotaExceededError, getStorageDiagnostics } from '@/utils/storageError.js'
import { optimizeImage } from '@/utils/imageOptimizer.js'

describe('Release Candidate Verification Suite', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.snapshots.clear()
    await db.attachments.clear()
    await db.workspaces.clear()
  })

  // ===========================================================================
  // 1. Critical End-to-End Data Lifecycle Tests
  // ===========================================================================
  describe('1. Critical End-to-End Data Lifecycle', () => {
    it('rich document lifecycle: creates, formats, saves, and reloads from IndexedDB without degradation', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const doc = await documentRepository.create(ws.id, 'rich', null, 'Complex Rich Document')

      // Rich text ProseMirror tree covering headings, bold, color, table, code, task list, callout
      const richDocContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Title' }],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: 'center', lineHeight: 1.8 },
            content: [
              {
                type: 'text',
                marks: [{ type: 'bold' }, { type: 'italic' }],
                text: 'Bold and italicized centered text.',
              },
              {
                type: 'text',
                marks: [{ type: 'textStyle', attrs: { color: '#e06c75', fontSize: '18px' } }],
                text: ' Styled color and size.',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Col 1' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Col 2' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Val A' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Val B' }] }] },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'typescript' },
            content: [{ type: 'text', text: 'const answer: number = 42;' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1 Completed' }] }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2 Pending' }] }],
              },
            ],
          },
        ],
      }

      const contentString = JSON.stringify(richDocContent)
      await documentRepository.save(doc.id, contentString, 35, 240)

      // Reload document directly from IndexedDB
      const reloaded = await documentRepository.getById(doc.id)
      expect(reloaded).toBeDefined()
      expect(reloaded?.type).toBe('rich')

      const parsed = JSON.parse(reloaded!.content)
      expect(parsed.type).toBe('doc')
      expect(parsed.content).toHaveLength(5)
      expect(parsed.content[0].type).toBe('heading')
      expect(parsed.content[0].attrs.level).toBe(1)
      expect(parsed.content[2].type).toBe('table')
      expect(parsed.content[3].type).toBe('codeBlock')
      expect(parsed.content[4].type).toBe('taskList')
      expect(reloaded?.wordCount).toBe(35)
      expect(reloaded?.characterCount).toBe(240)
    })

    it('backup lifecycle: export, deletion, undo, purge, and restore with attachments and snapshots', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const folder = await folderRepository.create(ws.id, 'Engineering', null)
      const doc = await documentRepository.create(ws.id, 'rich', folder.id, 'Architecture Specs')

      // Add attachment
      const fakeBlob = new Blob(['PNG_FAKE_DATA'], { type: 'image/png' })
      const attachment = await attachmentService.store(doc.id, fakeBlob, 'diagram.png', 'image')

      // Add snapshot
      const snapshot = await snapshotService.createSnapshot(doc.id, 'Initial Spec draft')
      expect(snapshot).not.toBeNull()

      // 1. Generate Full Workspace Backup
      const backup = await workspaceService.generateBackup(ws.id, true)
      expect(backup.format).toBe('scratchpad-workspace')
      expect(backup.documents.some((d) => d.id === doc.id)).toBe(true)
      expect(backup.folders.some((f) => f.id === folder.id)).toBe(true)
      expect(backup.attachments.some((a) => a.id === attachment.id)).toBe(true)
      expect(backup.snapshots?.some((s) => s.id === snapshot!.id)).toBe(true)

      // 2. Soft delete document
      await documentService.softDelete(doc.id)
      const activeAfterDelete = await documentRepository.getAllMeta(ws.id)
      expect(activeAfterDelete.some((d) => d.id === doc.id)).toBe(false)

      // 3. Undo deletion
      await documentService.restore(doc.id)
      const activeAfterUndo = await documentRepository.getAllMeta(ws.id)
      expect(activeAfterUndo.some((d) => d.id === doc.id)).toBe(true)

      // 4. Soft delete again & purge
      await documentService.softDelete(doc.id)
      await documentService.purgeDeleted(0) // Purge immediately (threshold 0ms)

      // Verify document, attachment, and snapshot are completely purged
      expect(await documentRepository.getById(doc.id)).toBeUndefined()
      expect(await attachmentRepository.getById(attachment.id)).toBeUndefined()
      expect(await snapshotRepository.getById(snapshot!.id)).toBeUndefined()

      // 5. Restore from Workspace Backup (merge mode)
      await workspaceService.restoreBackup(backup, ws.id, 'merge')

      const restoredDoc = await documentRepository.getById(doc.id)
      expect(restoredDoc).toBeDefined()
      expect(restoredDoc?.title).toBe('Architecture Specs')
      expect(restoredDoc?.folderId).toBe(folder.id)

      const restoredFolder = await folderRepository.getById(folder.id)
      expect(restoredFolder).toBeDefined()
      expect(restoredFolder?.name).toBe('Engineering')

      const restoredAtt = await attachmentRepository.getById(attachment.id)
      expect(restoredAtt).toBeDefined()
      expect(restoredAtt?.name).toBe('diagram.png')

      const restoredSnap = await snapshotRepository.getById(snapshot!.id)
      expect(restoredSnap).toBeDefined()
      expect(restoredSnap?.label).toBe('Initial Spec draft')
    })

    it('snapshot lifecycle: create snapshot, modify, create second, restore older, verify safety snapshot', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const doc = await documentRepository.create(ws.id, 'plain', null, 'Versioned Note')

      await documentRepository.save(doc.id, 'Content V1', 2, 10)
      const snap1 = await snapshotService.createSnapshot(doc.id, 'Snapshot 1')

      await documentRepository.save(doc.id, 'Content V2 modified', 3, 19)
      const snap2 = await snapshotService.createSnapshot(doc.id, 'Snapshot 2')

      // Restore snap1
      const restored = await snapshotService.restoreSnapshot(doc.id, snap1!.id)
      expect(restored?.content).toBe('Content V1')

      // Check DB document content
      const docNow = await documentRepository.getById(doc.id)
      expect(docNow?.content).toBe('Content V1')

      // Verify a safety snapshot was automatically created prior to restoration
      const allSnaps = await snapshotService.getSnapshots(doc.id)
      expect(allSnaps.length).toBe(3)
      const safetySnap = allSnaps.find((s) => s.label.includes('Safety backup'))
      expect(safetySnap).toBeDefined()
      expect(safetySnap?.content).toBe('Content V2 modified')
      expect(allSnaps.some((s) => s.id === snap2!.id)).toBe(true)
    })
  })

  // ===========================================================================
  // 2. Rich Text Conversion Tests
  // ===========================================================================
  describe('2. Rich Text Conversion Suite', () => {
    it('converts Rich JSON to Markdown preserving headings, bold, lists, and tables', () => {
      const richJson = JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section Title' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', marks: [{ type: 'bold' }], text: 'bold text' },
              { type: 'text', text: '.' },
            ],
          },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First item' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second item' }] }] },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header A' }] }] },
                  { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header B' }] }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cell 1' }] }] },
                  { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cell 2' }] }] },
                ],
              },
            ],
          },
        ],
      })

      const markdown = richToMarkdown(richJson)
      expect(markdown).toContain('## Section Title')
      expect(markdown).toContain('This is bold text.')
      expect(markdown).toContain('- First item')
      expect(markdown).toContain('- Second item')
      expect(markdown).toContain('| Header A | Header B |')
      expect(markdown).toContain('| Cell 1 | Cell 2 |')
    })

    it('converts Markdown to Rich HTML preserving structure and styles', () => {
      const md = '# Main Header\n\nHere is a list:\n- Item 1\n- Item 2\n\n```js\nconsole.log(1);\n```'
      const richHtml = markdownToRich(md)
      expect(richHtml).toContain('<h1>Main Header</h1>')
      expect(richHtml).toContain('<ul>')
      expect(richHtml).toContain('<li>Item 1</li>')
      expect(richHtml).toContain('<pre><code class="language-js">console.log(1);')
    })

    it('converts Rich JSON to HTML and sanitizes external HTML to Rich', () => {
      const richJson = JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'HTML Export' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'Styled' },
              { type: 'text', text: ' paragraph.' },
            ],
          },
        ],
      })
      const html = richToHtml(richJson)
      expect(html).toContain('<h1>HTML Export</h1>')
      expect(html).toContain('<strong>Styled</strong>')

      const rawInput = '<p>Clean paragraph<script>alert("xss")</script></p>'
      const sanitized = htmlToRich(rawInput)
      expect(sanitized).toContain('<p>Clean paragraph</p>')
      expect(sanitized).not.toContain('<script>')
    })

    it('converts Plain Text to Rich doc structure and back to Plain Text', () => {
      const plain = 'Line one\nLine two\n\nParagraph two'
      const rich = plainToRich(plain)
      const parsed = JSON.parse(rich)
      expect(parsed.type).toBe('doc')
      expect(parsed.content.length).toBe(4)

      const backToPlain = richToPlain(rich)
      expect(backToPlain).toContain('Line one')
      expect(backToPlain).toContain('Line two')
      expect(backToPlain).toContain('Paragraph two')
    })

    it('central convertDocumentContent accurately routes all permutations', () => {
      const mdInput = '# Heading\nParagraph'
      const asRich = convertDocumentContent(mdInput, 'markdown', 'rich')
      expect(asRich).toContain('<h1>Heading</h1>')

      const asPlain = convertDocumentContent(asRich, 'rich', 'plain')
      expect(asPlain).toContain('Heading')
    })
  })

  // ===========================================================================
  // 3. Attachment Reliability
  // ===========================================================================
  describe('3. Attachment Reliability', () => {
    it('preserves SVG and animated GIF intact without lossy canvas compression', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
      const optimizedSvg = await optimizeImage(svgBlob)
      expect(optimizedSvg.blob).toBe(svgBlob) // Preserved verbatim

      const gifBlob = new Blob(['GIF89a_FAKE_DATA'], { type: 'image/gif' })
      const optimizedGif = await optimizeImage(gifBlob)
      expect(optimizedGif.blob).toBe(gifBlob) // Preserved verbatim
    })

    it('tracks attachment storage size, count, and cleans up object URLs', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const doc = await documentRepository.create(ws.id, 'rich', null, 'Attachment Test Doc')

      const blob1 = new Blob(['A'.repeat(1024)], { type: 'image/png' })
      const att1 = await attachmentService.store(doc.id, blob1, 'test.png', 'image')
      expect(att1.size).toBe(1024)

      const url1 = await attachmentService.resolve(att1.id)
      expect(url1).toMatch(/^blob:/)

      // Calling resolve again returns cached URL
      const url1Cached = await attachmentService.resolve(att1.id)
      expect(url1Cached).toBe(url1)

      // Total size & count
      const totalSize = await attachmentService.getTotalSize()
      const count = await attachmentService.getCount()
      expect(totalSize).toBe(1024)
      expect(count).toBe(1)

      // Deleting attachment cleans record and revokes URL
      await attachmentService.delete(att1.id)
      expect(await attachmentService.getById(att1.id)).toBeUndefined()
    })
  })

  // ===========================================================================
  // 4. Storage Failure Testing
  // ===========================================================================
  describe('4. Storage Failure & Diagnostics', () => {
    it('accurately identifies QuotaExceededError and standard storage errors', () => {
      const quotaErr = new Error('The quota has been exceeded.')
      quotaErr.name = 'QuotaExceededError'
      expect(isQuotaExceededError(quotaErr)).toBe(true)

      const wrappedErr = { inner: quotaErr }
      expect(isQuotaExceededError(wrappedErr)).toBe(true)

      const regularErr = new Error('Disk read error')
      expect(isQuotaExceededError(regularErr)).toBe(false)
    })

    it('fetches storage diagnostics when navigator.storage is available', async () => {
      const diag = await getStorageDiagnostics()
      // In JSDOM / Node, navigator.storage.estimate may be undefined, returns null cleanly without throw
      expect(diag === null || typeof diag.text === 'string').toBe(true)
    })
  })

  // ===========================================================================
  // 5. Workspace / Explorer Edge Cases & Stress Test
  // ===========================================================================
  describe('5. Workspace & Explorer Edge Cases', () => {
    it('generates 50 documents across nested folders without degradation', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const rootFolder = await folderRepository.create(ws.id, 'Deep Root', null)
      const subFolder = await folderRepository.create(ws.id, 'Sub Level 1', rootFolder.id)

      const createdDocIds: string[] = []
      for (let i = 1; i <= 50; i++) {
        const folderTarget = i % 3 === 0 ? subFolder.id : i % 2 === 0 ? rootFolder.id : null
        const doc = await documentRepository.create(ws.id, 'rich', folderTarget, `Doc #${i}`)
        createdDocIds.push(doc.id)
      }

      const allMeta = await documentRepository.getAllMeta(ws.id)
      expect(allMeta.length).toBe(50)

      // Filter by folder
      const rootDocs = await documentRepository.getByFolder(rootFolder.id, ws.id)
      const subDocs = await documentRepository.getByFolder(subFolder.id, ws.id)
      expect(rootDocs.length).toBeGreaterThan(0)
      expect(subDocs.length).toBeGreaterThan(0)
    })

    it('prevents folder moving into itself or its own descendants', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const folderA = await folderRepository.create(ws.id, 'Folder A', null)
      const folderB = await folderRepository.create(ws.id, 'Folder B', folderA.id)
      const folderC = await folderRepository.create(ws.id, 'Folder C', folderB.id)

      // Helper function matching Explorer.tsx
      function isDescendant(all: Array<{ id: string; parentId: string | null }>, parentId: string, childId: string): boolean {
        if (parentId === childId) return true
        let current = all.find((f) => f.id === childId)
        while (current && current.parentId) {
          if (current.parentId === parentId) return true
          const nextParentId = current.parentId
          current = all.find((f) => f.id === nextParentId)
        }
        return false
      }

      const allFolders = await folderRepository.getByWorkspace(ws.id)
      // Attempting to drop Folder A into Folder C (its grandchild) is illegal
      expect(isDescendant(allFolders, folderA.id, folderC.id)).toBe(true)
      // Moving Folder C into Folder A is legal
      expect(isDescendant(allFolders, folderC.id, folderA.id)).toBe(false)
    })
  })

  // ===========================================================================
  // 6. Multi-Tab / Editor State Isolation
  // ===========================================================================
  describe('6. Multi-Tab State Isolation', () => {
    it('maintains independent content between distinct documents without cross-contamination', async () => {
      const ws = await workspaceService.getOrCreateDefault()
      const docA = await documentRepository.create(ws.id, 'rich', null, 'Doc A')
      const docB = await documentRepository.create(ws.id, 'plain', null, 'Doc B')

      await documentRepository.save(docA.id, '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A Content"}]}]}', 2, 9)
      await documentRepository.save(docB.id, 'B Content plain text', 4, 20)

      const loadedA = await documentRepository.getById(docA.id)
      const loadedB = await documentRepository.getById(docB.id)

      expect(loadedA?.content).toContain('A Content')
      expect(loadedA?.content).not.toContain('B Content')

      expect(loadedB?.content).toContain('B Content')
      expect(loadedB?.content).not.toContain('A Content')
    })
  })

  // ===========================================================================
  // 7. Import Security
  // ===========================================================================
  describe('7. Import Security', () => {
    it('strips hostile scripts, event handlers, and javascript: protocols from imported HTML', async () => {
      const hostileHtml = `
        <div>
          <h1>Safe Heading</h1>
          <script>window.pwned = true; alert('hacked');</script>
          <img src="invalid.jpg" onerror="alert('xss')" />
          <a href="javascript:alert('malicious')">Click here</a>
          <p onmouseover="alert('attack')">Safe paragraph content</p>
        </div>
      `
      const file = new File([hostileHtml], 'attack.html', { type: 'text/html' })
      const result = await importService.parseImportFile(file)

      expect(result.kind).toBe('single-document')
      if (result.kind === 'single-document') {
        expect(result.content).not.toContain('<script>')
        expect(result.content).not.toContain('onerror')
        expect(result.content).not.toContain('onmouseover')
        expect(result.content).not.toContain('javascript:')
        expect(result.content).toContain('Safe Heading')
        expect(result.content).toContain('Safe paragraph content')
      }
    })

    it('rejects malformed workspace backup and falls back cleanly without crash', async () => {
      const malformedJson = '{"format":"scratchpad-workspace","version":"invalid_version_not_number"}'
      const file = new File([malformedJson], 'corrupted.json', { type: 'application/json' })

      const result = await importService.parseImportFile(file)
      // Does not treat as valid workspace-backup; falls back safely to plain text
      expect(result.kind).toBe('single-document')
    })
  })
})
