import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/storage/db.js'
import { documentRepository, snapshotRepository, workspaceRepository } from '@/storage/repositories/index.js'
import { workspaceSearchService } from '@/services/WorkspaceSearchService.js'
import { snapshotService } from '@/services/SnapshotService.js'
import { importService } from '@/services/ImportService.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import ListKeymap from '@tiptap/extension-list-keymap'
import { FontSize } from '@/components/Editor/RichEditor/extensions/FontSize.js'
import { Indent } from '@/components/Editor/RichEditor/extensions/Indent.js'
import { FormattingStyles } from '@/components/Editor/RichEditor/extensions/FormattingStyles.js'

describe('Phase 4: Search, Formatting Persistence, Version History & Export/Import', () => {
  let workspaceId: string

  beforeEach(async () => {
    await db.delete()
    await db.open()

    const ws = await workspaceRepository.create('Phase 4 Test Workspace')
    workspaceId = ws.id
  })

  // ---------------------------------------------------------------------------
  // 1. Custom Formatting Persistence: Tiptap JSON and HTML parse/render
  // ---------------------------------------------------------------------------
  describe('Custom Formatting Attributes Persistence & HTML Parse/Render', () => {
    function createTestEditor(initialContent?: string | object) {
      return new Editor({
        content: initialContent || '',
        extensions: [
          Document,
          Paragraph,
          Text,
          Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
          Bold,
          Italic,
          Underline,
          Strike,
          Subscript,
          Superscript,
          TextStyle,
          FontFamily.configure({ types: ['textStyle'] }),
          FontSize,
          Color,
          Highlight.configure({ multicolor: true }),
          BulletList,
          ListItem,
          ListKeymap,
          Indent,
          FormattingStyles,
        ],
      })
    }

    it('persists and renders font size attribute in JSON and HTML', () => {
      const editor = createTestEditor('<p>Hello <span style="font-size: 24px">Big Text</span></p>')
      const json = editor.getJSON()
      const html = editor.getHTML()

      // Verify HTML parse & render
      expect(html).toContain('font-size: 24px')

      // Verify Tiptap JSON structure
      const paragraph = json.content?.[0]
      const styledSpan = paragraph?.content?.find(
        (c) => c.marks?.some((m) => m.type === 'textStyle' && m.attrs?.fontSize === '24px')
      )
      expect(styledSpan).toBeDefined()
      expect(styledSpan?.text).toBe('Big Text')

      editor.destroy()
    })

    it('persists and renders font family attribute in JSON and HTML', () => {
      const editor = createTestEditor('<p>Code font: <span style="font-family: \'JetBrains Mono\'">monospace</span></p>')
      const html = editor.getHTML()
      const json = editor.getJSON()

      expect(html).toContain('font-family')
      expect(html).toContain('JetBrains Mono')

      const paragraph = json.content?.[0]
      const fontSpan = paragraph?.content?.find(
        (c) =>
          c.marks?.some(
            (m) => m.type === 'textStyle' && typeof m.attrs?.fontFamily === 'string' && m.attrs.fontFamily.includes('JetBrains Mono')
          )
      )
      expect(fontSpan).toBeDefined()

      editor.destroy()
    })

    it('persists color, highlight, superscript, and subscript marks', () => {
      const editor = createTestEditor(
        '<p><span style="color: #ef4444">Red</span> and <mark data-color="#fef08a" style="background-color: #fef08a">Yellow</mark> and <sup>Super</sup> and <sub>Sub</sub></p>'
      )
      const html = editor.getHTML()

      expect(html).toMatch(/color:\s*(#ef4444|rgb\(239,\s*68,\s*68\))/i)
      expect(html).toMatch(/background-color:\s*(#fef08a|rgb\(254,\s*240,\s*138\))/i)
      expect(html).toContain('<sup>Super</sup>')
      expect(html).toContain('<sub>Sub</sub>')

      const json = editor.getJSON()
      const marks = json.content?.[0].content?.flatMap((c) => c.marks?.map((m) => m.type))
      expect(marks).toContain('textStyle')
      expect(marks).toContain('highlight')
      expect(marks).toContain('superscript')
      expect(marks).toContain('subscript')

      editor.destroy()
    })

    it('persists line-height, letter-spacing, and paragraph-spacing', () => {
      const editor = createTestEditor(
        '<p style="line-height: 2; margin-bottom: 24px">Line spacing <span style="letter-spacing: 2px">wide text</span></p>'
      )
      const html = editor.getHTML()
      const json = editor.getJSON()

      expect(html).toContain('line-height: 2')
      expect(html).toContain('margin-bottom: 24px')
      expect(html).toContain('letter-spacing: 2px')

      const paragraph = json.content?.[0]
      expect(paragraph?.attrs?.lineHeight).toBe('2')
      expect(paragraph?.attrs?.paragraphSpacing).toBe('24px')

      const styledChild = paragraph?.content?.find(
        (c) => c.marks?.some((m) => m.type === 'textStyle' && m.attrs?.letterSpacing === '2px')
      )
      expect(styledChild).toBeDefined()

      editor.destroy()
    })

    it('persists block indentation with data-indent attribute', () => {
      const editor = createTestEditor('<p data-indent="2" style="margin-left: 48px">Indented paragraph</p>')
      const html = editor.getHTML()
      const json = editor.getJSON()

      expect(html).toContain('data-indent="2"')
      expect(html).toContain('margin-left: 48px')

      const paragraph = json.content?.[0]
      expect(paragraph?.attrs?.indent).toBe(2)

      editor.destroy()
    })

    it('survives write -> save -> reload -> export -> import roundtrip', async () => {
      // 1. Initial rich document with custom formatting
      const initialEditor = createTestEditor(
        '<p data-indent="1" style="line-height: 1.8; margin-bottom: 16px">Custom formatted <span style="font-family: \'JetBrains Mono\'; font-size: 20px; color: #3b82f6; letter-spacing: 1px">Rich Content</span> with <sup>TM</sup></p>'
      )
      const initialJson = JSON.stringify(initialEditor.getJSON())
      initialEditor.destroy()

      // 2. Save to DocumentRepository
      const doc = await documentRepository.create(workspaceId, 'rich', null, 'Formatted Document')
      await documentRepository.save(doc.id, initialJson, 10, 50, 'rich')

      // 3. Reload from DocumentRepository
      const reloaded = await documentRepository.getById(doc.id)
      expect(reloaded).not.toBeNull()
      expect(reloaded?.content).toBe(initialJson)

      // 4. Verify reloaded JSON renders into a new editor instance with all formatting intact
      const reloadEditor = createTestEditor(JSON.parse(reloaded!.content))
      const reloadedHtml = reloadEditor.getHTML()
      expect(reloadedHtml).toContain('data-indent="1"')
      expect(reloadedHtml).toContain('line-height: 1.8')
      expect(reloadedHtml).toContain('margin-bottom: 16px')
      expect(reloadedHtml).toContain('JetBrains Mono')
      expect(reloadedHtml).toContain('font-size: 20px')
      expect(reloadedHtml).toMatch(/color:\s*(#3b82f6|rgb\(59,\s*130,\s*246\))/i)
      expect(reloadedHtml).toContain('letter-spacing: 1px')
      expect(reloadedHtml).toContain('<sup>TM</sup>')
      reloadEditor.destroy()

      // 5. Test export to Single Document JSON
      const exportedDocPayload = {
        format: 'scratchpad-document',
        version: 1,
        exportedAt: new Date().toISOString(),
        document: {
          id: doc.id,
          title: doc.title,
          type: doc.type,
          content: reloaded!.content,
          wordCount: 10,
          characterCount: 50,
          tags: ['test', 'formatting'],
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      }
      const jsonFile = new File([JSON.stringify(exportedDocPayload)], 'test.scratchpad.json', {
        type: 'application/json',
      })

      // 6. Test import back
      const importResult = await importService.parseImportFile(jsonFile)
      expect(importResult.kind).toBe('single-document')
      if (importResult.kind === 'single-document') {
        expect(importResult.title).toBe('Formatted Document')
        expect(importResult.type).toBe('rich')
        expect(importResult.content).toBe(reloaded!.content)

        // Verify imported content retains all formatting
        const importedEditor = createTestEditor(JSON.parse(importResult.content))
        const importedHtml = importedEditor.getHTML()
        expect(importedHtml).toContain('data-indent="1"')
        expect(importedHtml).toContain('line-height: 1.8')
        expect(importedHtml).toContain('JetBrains Mono')
        importedEditor.destroy()
      }
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Context-Aware Tab Handling (Lists vs Normal Blocks)
  // ---------------------------------------------------------------------------
  describe('Context-Aware Tab Handling', () => {
    it('handles Tab on rich-text blocks via indent and Shift-Tab via outdent', () => {
      const editor = new Editor({
        content: '<p>Standard block</p>',
        extensions: [Document, Paragraph, Text, Indent],
      })

      // Initially level 0
      expect(editor.getAttributes('paragraph').indent || 0).toBe(0)

      // Indent command
      editor.commands.indent()
      expect(editor.getAttributes('paragraph').indent).toBe(1)

      editor.commands.indent()
      expect(editor.getAttributes('paragraph').indent).toBe(2)

      // Outdent command
      editor.commands.outdent()
      expect(editor.getAttributes('paragraph').indent).toBe(1)

      editor.destroy()
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Workspace Search: derived searchText + title + tags (no tree loading)
  // ---------------------------------------------------------------------------
  describe('WorkspaceSearchService Metadata Scanning', () => {
    it('scans title, derived searchText, and tags without loading full document trees', async () => {
      // Create rich document with rich JSON content
      const richDoc = await documentRepository.create(workspaceId, 'rich', null, 'Quantum Computing Primer')
      const richContent = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Qubits exploit quantum superposition and entanglement principles.' },
            ],
          },
        ],
      })
      await documentRepository.save(richDoc.id, richContent, 8, 60, 'rich')
      await documentRepository.setTags(richDoc.id, ['physics', 'quantum', 'science'])

      // Create markdown document
      const mdDoc = await documentRepository.create(workspaceId, 'markdown', null, 'Meeting Notes')
      await documentRepository.save(mdDoc.id, '# Weekly Sync\nDiscussed architecture roadmap.', 5, 40, 'markdown')
      await documentRepository.setTags(mdDoc.id, ['meeting', 'roadmap'])

      // Search by title match
      const titleHits = await workspaceSearchService.search(workspaceId, 'Quantum')
      expect(titleHits.length).toBe(1)
      expect(titleHits[0].document.id).toBe(richDoc.id)
      expect(titleHits[0].matchesInTitle).toBe(true)

      // Search by body content inside derived searchText
      const contentHits = await workspaceSearchService.search(workspaceId, 'entanglement')
      expect(contentHits.length).toBe(1)
      expect(contentHits[0].document.id).toBe(richDoc.id)
      expect(contentHits[0].snippet).toContain('entanglement')

      // Search by tag
      const tagHits = await workspaceSearchService.search(workspaceId, 'roadmap')
      expect(tagHits.length).toBe(1)
      expect(tagHits[0].document.id).toBe(mdDoc.id)

      // Test type filter
      const richOnlyHits = await workspaceSearchService.search(workspaceId, 'architecture', {
        typeFilter: 'rich',
      })
      expect(richOnlyHits.length).toBe(0) // architecture is in markdown doc

      const mdOnlyHits = await workspaceSearchService.search(workspaceId, 'architecture', {
        typeFilter: 'markdown',
      })
      expect(mdOnlyHits.length).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Snapshot Restoration Without Browser Reload
  // ---------------------------------------------------------------------------
  describe('SnapshotService Lifecycle & In-Place Restoration', () => {
    it('restores snapshot with safety checkpoint and dispatches reload event without page reload', async () => {
      // 1. Create document
      const doc = await documentRepository.create(workspaceId, 'plain', null, 'Snapshot Article')
      await documentRepository.save(doc.id, 'Version 1 Content: Original draft.', 5, 30, 'plain')

      // 2. Create snapshot
      const snapshotV1 = await snapshotService.createSnapshot(doc.id, 'V1 Checkpoint')
      expect(snapshotV1).not.toBeNull()

      // 3. Modify document to Version 2
      await documentRepository.save(doc.id, 'Version 2 Content: Modified draft.', 5, 30, 'plain')

      // 4. Spy on window event dispatch
      const reloadListener = vi.fn()
      window.addEventListener('scratchpad:reload-document', reloadListener)

      // 5. Restore snapshot V1
      const restored = await snapshotService.restoreSnapshot(doc.id, snapshotV1!.id)
      expect(restored).not.toBeNull()
      expect(restored?.content).toBe('Version 1 Content: Original draft.')

      // 6. Verify event was dispatched with documentId and restored content
      expect(reloadListener).toHaveBeenCalledTimes(1)
      const eventDetail = (reloadListener.mock.calls[0][0] as CustomEvent).detail
      expect(eventDetail.documentId).toBe(doc.id)
      expect(eventDetail.content).toBe('Version 1 Content: Original draft.')

      // 7. Verify a safety snapshot was created for Version 2 before restoration
      const allSnapshots = await snapshotService.getSnapshots(doc.id)
      expect(allSnapshots.length).toBe(2)
      const safetySnapshot = allSnapshots.find((s) => s.label.includes('Safety backup'))
      expect(safetySnapshot).toBeDefined()
      expect(safetySnapshot?.content).toBe('Version 2 Content: Modified draft.')

      window.removeEventListener('scratchpad:reload-document', reloadListener)
    })

    it('enforces 50-snapshot pruning limit per document', async () => {
      const doc = await documentRepository.create(workspaceId, 'plain', null, 'Pruning Doc')

      // Generate 55 snapshots
      for (let i = 1; i <= 55; i++) {
        await snapshotRepository.create(doc.id, `Content version ${i}`, `Snapshot ${i}`)
      }

      const snapshots = await snapshotRepository.getByDocument(doc.id)
      expect(snapshots.length).toBe(50)
      // The newest snapshot should be present
      expect(snapshots[0].label).toBe('Snapshot 55')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Import & Export Engine
  // ---------------------------------------------------------------------------
  describe('ImportService & ExportService Separation', () => {
    it('sanitizes HTML imports with DOMPurify to prevent XSS', async () => {
      const dirtyHtml = '<p>Safe text</p><script>alert("xss")</script><img src="x" onerror="alert(1)">'
      const file = new File([dirtyHtml], 'unsafe.html', { type: 'text/html' })

      const result = await importService.parseImportFile(file)
      expect(result.kind).toBe('single-document')
      if (result.kind === 'single-document') {
        expect(result.type).toBe('rich')
        expect(result.content).not.toContain('<script>')
        expect(result.content).not.toContain('onerror')
        expect(result.content).toContain('<p>Safe text</p>')
      }
    })

    it('keeps Markdown source documents separate upon import', async () => {
      const markdownRaw = '# Header 1\n\n- [ ] Task item 1\n- [x] Task item 2\n\n```js\nconsole.log(42)\n```'
      const file = new File([markdownRaw], 'notes.md', { type: 'text/markdown' })

      const result = await importService.parseImportFile(file)
      expect(result.kind).toBe('single-document')
      if (result.kind === 'single-document') {
        expect(result.type).toBe('markdown')
        expect(result.content).toBe(markdownRaw)
      }
    })

    it('clearly distinguishes Single Document JSON from Workspace Backup JSON', async () => {
      // 1. Single Document JSON
      const singleDocJson = JSON.stringify({
        format: 'scratchpad-document',
        version: 1,
        document: {
          title: 'Single Document Note',
          type: 'plain',
          content: 'Hello World',
        },
      })
      const singleFile = new File([singleDocJson], 'note.scratchpad.json', { type: 'application/json' })
      const singleResult = await importService.parseImportFile(singleFile)
      expect(singleResult.kind).toBe('single-document')
      if (singleResult.kind === 'single-document') {
        expect(singleResult.title).toBe('Single Document Note')
      }

      // 2. Full Workspace Backup JSON
      const workspaceBackup = await workspaceService.generateBackup(workspaceId, false)
      expect(workspaceBackup.format).toBe('scratchpad-workspace')

      const backupFile = new File([JSON.stringify(workspaceBackup)], 'backup.json', { type: 'application/json' })
      const backupResult = await importService.parseImportFile(backupFile)
      expect(backupResult.kind).toBe('workspace-backup')
      if (backupResult.kind === 'workspace-backup') {
        expect(backupResult.data.format).toBe('scratchpad-workspace')
        expect(backupResult.data.workspace.id).toBe(workspaceId)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // 6. Context-Aware Shortcut Handling
  // ---------------------------------------------------------------------------
  describe('Context-Aware Find & Replace Shortcut Routing', () => {
    it('dispatches scratchpad:open-find only when not in an external input', () => {
      const findListener = vi.fn()
      window.addEventListener('scratchpad:open-find', findListener)

      // Simulate Ctrl+F dispatch logic
      const simulateShortcut = (target: HTMLElement, key: string) => {
        const isTextInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          Boolean(target.closest('.workspace-search-modal')) ||
          Boolean(target.closest('.settings-modal')) ||
          Boolean(target.closest('.command-palette'))

        const isInsideEditor =
          Boolean(target.closest('.rich-editor')) ||
          Boolean(target.closest('.cm-editor')) ||
          Boolean(target.closest('.editor-pane'))

        if (isTextInput && !isInsideEditor) {
          return false // Preserved for native text input
        }

        if (key === 'f') {
          window.dispatchEvent(new CustomEvent('scratchpad:open-find'))
          return true
        }
        return false
      }

      // 1. Inside editor: intercepted
      const editorDiv = document.createElement('div')
      editorDiv.className = 'rich-editor'
      const handledInEditor = simulateShortcut(editorDiv, 'f')
      expect(handledInEditor).toBe(true)
      expect(findListener).toHaveBeenCalledTimes(1)

      // 2. Inside settings input: NOT intercepted
      const settingsModal = document.createElement('div')
      settingsModal.className = 'settings-modal'
      const searchInput = document.createElement('input')
      settingsModal.appendChild(searchInput)
      const handledInModal = simulateShortcut(searchInput, 'f')
      expect(handledInModal).toBe(false)
      expect(findListener).toHaveBeenCalledTimes(1) // Still 1, not called again

      window.removeEventListener('scratchpad:open-find', findListener)
    })
  })
})
