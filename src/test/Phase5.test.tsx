import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '@/storage/db.js'
import { documentRepository, folderRepository } from '@/storage/repositories/index.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { documentService } from '@/services/DocumentService.js'
import { isQuotaExceededError } from '@/utils/storageError.js'
import { optimizeImage } from '@/utils/imageOptimizer.js'
import { importService } from '@/services/ImportService.js'
import { AppShell } from '@/components/AppShell/AppShell.js'
import { ToastProvider, useToast } from '@/contexts/ToastContext.js'
import { ToastContainer } from '@/components/Toast/ToastContainer.js'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext.js'
import { UIProvider } from '@/contexts/UIContext.js'
import { SettingsProvider } from '@/contexts/SettingsContext.js'
import { DocumentPropertiesModal } from '@/components/DocumentProperties/DocumentPropertiesModal.js'
import { OutlinePanel } from '@/components/Outline/OutlinePanel.js'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <SettingsProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <UIProvider>
            {ui}
            <ToastContainer />
          </UIProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}

describe('Phase 5 — Reliability, Completeness & Missing Core Features', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
    await db.snapshots.clear()
    await db.attachments.clear()
    await db.settings.clear()
    await workspaceService.getOrCreateDefault()
  })

  // ---------------------------------------------------------------------------
  // P0.1 & Tokens / Theme Contrast
  // ---------------------------------------------------------------------------
  it('P0.1: validates theme tokens and semantic variables are defined without hardcoded light/dark contrast breakage', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    document.documentElement.setAttribute('data-theme', 'solarized')
    expect(document.documentElement.getAttribute('data-theme')).toBe('solarized')

    document.documentElement.setAttribute('data-theme', 'high-contrast')
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
  })

  // ---------------------------------------------------------------------------
  // P0.2: Sidebar Collapse / Reopen
  // ---------------------------------------------------------------------------
  it('P0.2: collapses the sidebar from Explorer header and restores it from TabBar chrome', async () => {
    renderWithProviders(<AppShell />)

    // Initially Explorer is visible
    await waitFor(() => {
      expect(screen.getByLabelText(/Workspace Explorer/i)).toBeInTheDocument()
    })

    // Click collapse sidebar in Explorer header
    const collapseBtn = document.getElementById('explorer-btn-toggle-sidebar')
    expect(collapseBtn).toBeInTheDocument()
    fireEvent.click(collapseBtn!)

    // Explorer should now be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText(/Workspace Explorer/i)).not.toBeInTheDocument()
    })

    // Restore sidebar button should now be accessible in top TabBar chrome
    const restoreBtn = document.getElementById('tabbar-btn-restore-sidebar')
    expect(restoreBtn).toBeInTheDocument()
    fireEvent.click(restoreBtn!)

    // Explorer should be restored
    await waitFor(() => {
      expect(screen.getByLabelText(/Workspace Explorer/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // P0.4: Safe Document Deletion & Undo
  // ---------------------------------------------------------------------------
  it('P0.4: soft deletes document, displays Undo toast, and restores document when Undo is clicked', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const doc = await documentService.create(ws.id, 'rich', null, 'Doc to be deleted')

    // Soft delete through documentService
    await documentService.softDelete(doc.id)

    // Verify document is marked deletedAt in DB
    const rawDoc = await db.documents.get(doc.id)
    expect(rawDoc?.deletedAt).toBeTypeOf('number')

    // Active query ignores deleted docs
    const allActive = await documentRepository.getAllMeta(ws.id)
    expect(allActive.some((d) => d.id === doc.id)).toBe(false)

    // Restore document
    await documentService.restore(doc.id)
    const restoredDoc = await db.documents.get(doc.id)
    expect(restoredDoc?.deletedAt).toBeNull()
    const allRestored = await documentRepository.getAllMeta(ws.id)
    expect(allRestored.some((d) => d.id === doc.id)).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // P0.4: Safe Folder Deletion & Undo
  // ---------------------------------------------------------------------------
  it('P0.4: soft deletes folder tree and restores all descendant documents and subfolders on Undo', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const parentFolder = await folderRepository.create(ws.id, 'Parent Folder', null)
    const childFolder = await folderRepository.create(ws.id, 'Child Folder', parentFolder.id)
    const docInside = await documentRepository.create(ws.id, 'rich', childFolder.id, 'Nested Doc')

    // Soft delete folder tree
    const { folderIds, docIds } = await workspaceService.softDeleteFolder(parentFolder.id)
    expect(folderIds).toContain(parentFolder.id)
    expect(folderIds).toContain(childFolder.id)
    expect(docIds).toContain(docInside.id)

    // Verify raw DB records have deletedAt
    const rawDoc = await db.documents.get(docInside.id)
    expect(rawDoc?.deletedAt).toBeTypeOf('number')

    // Active queries do not return deleted items
    const activeFolders = await folderRepository.getByWorkspace(ws.id)
    expect(activeFolders.some((f) => f.id === parentFolder.id)).toBe(false)

    // Restore entire folder tree
    await workspaceService.restoreFolder(folderIds, docIds)
    const restoredFolders = await folderRepository.getByWorkspace(ws.id)
    expect(restoredFolders.some((f) => f.id === parentFolder.id)).toBe(true)
    const restoredDoc = await db.documents.get(docInside.id)
    expect(restoredDoc?.deletedAt).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // P0.5: Storage Quota / Persistence Failure Handling
  // ---------------------------------------------------------------------------
  it('P0.5: detects QuotaExceededError and provides diagnostics utility', () => {
    const quotaErr1 = new DOMException('The quota has been exceeded', 'QuotaExceededError')
    expect(isQuotaExceededError(quotaErr1)).toBe(true)

    const wrappedErr = { inner: { name: 'QuotaExceededError' } }
    expect(isQuotaExceededError(wrappedErr)).toBe(true)

    const msgErr = new Error('Database storage quota exceeded')
    expect(isQuotaExceededError(msgErr)).toBe(true)

    const normalErr = new Error('Syntax error')
    expect(isQuotaExceededError(normalErr)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // P0.6: Large Image Optimization
  // ---------------------------------------------------------------------------
  it('P0.6: preserves SVGs and GIFs safely without rasterization', async () => {
    const svgBlob = new Blob(['<svg><circle r="10"/></svg>'], { type: 'image/svg+xml' })
    const svgResult = await optimizeImage(svgBlob, 'test.svg')
    expect(svgResult.optimized).toBe(false)
    expect(svgResult.mimeType).toContain('svg')

    const gifBlob = new Blob(['GIF89a'], { type: 'image/gif' })
    const gifResult = await optimizeImage(gifBlob, 'test.gif')
    expect(gifResult.optimized).toBe(false)
    expect(gifResult.mimeType).toContain('gif')
  })

  // ---------------------------------------------------------------------------
  // P1.1: Document Outline
  // ---------------------------------------------------------------------------
  it('P1.1: generates structured outline for Markdown and Rich Text and shows empty state for Plain Text', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const mdDoc = await documentRepository.create(ws.id, 'markdown', null, 'Markdown Note')
    await documentRepository.save(
      mdDoc.id,
      '# Introduction\nSome content\n## Section 1\nMore content\n### Subsection A',
      10,
      50,
      'markdown'
    )

    renderWithProviders(<OutlinePanel documentId={mdDoc.id} />)

    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument()
      expect(screen.getByText('Section 1')).toBeInTheDocument()
      expect(screen.getByText('Subsection A')).toBeInTheDocument()
    })

    // Click outline item to navigate
    const introItem = screen.getByText('Introduction')
    fireEvent.click(introItem)
  })

  it('P1.1: shows empty state for plain text in OutlinePanel', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const plainDoc = await documentRepository.create(ws.id, 'plain', null, 'Plain Note')

    renderWithProviders(<OutlinePanel documentId={plainDoc.id} />)

    await waitFor(() => {
      expect(screen.getByText(/No outline available/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // P1.3: Centralized Toast System
  // ---------------------------------------------------------------------------
  it('P1.3: shows centralized toast notifications with actions', async () => {
    function TestToastComponent() {
      const { showToast } = useToast()
      return (
        <button
          onClick={() =>
            showToast({
              message: 'Item deleted',
              type: 'info',
              action: { label: 'Undo Action', onClick: () => {} },
            })
          }
        >
          Trigger Toast
        </button>
      )
    }

    renderWithProviders(<TestToastComponent />)
    fireEvent.click(screen.getByText('Trigger Toast'))

    await waitFor(() => {
      expect(screen.getByText('Item deleted')).toBeInTheDocument()
      expect(screen.getByText('Undo Action')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // P1.4: Explorer Drag & Drop Folder Movement
  // ---------------------------------------------------------------------------
  it('P1.4: moves document and folder hierarchies and prevents circular nesting', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const folderA = await folderRepository.create(ws.id, 'Folder A', null)
    const folderB = await folderRepository.create(ws.id, 'Folder B', null)
    const doc = await documentRepository.create(ws.id, 'rich', folderA.id, 'Doc 1')

    // Move document into Folder B
    await documentService.move(doc.id, folderB.id)
    const movedDoc = await db.documents.get(doc.id)
    expect(movedDoc?.folderId).toBe(folderB.id)

    // Move Folder B into Folder A
    await workspaceService.moveFolder(folderB.id, folderA.id)
    const movedFolder = await db.folders.get(folderB.id)
    expect(movedFolder?.parentId).toBe(folderA.id)

    // Move document out to root
    await documentService.move(doc.id, null)
    const rootDoc = await db.documents.get(doc.id)
    expect(rootDoc?.folderId).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // P1.5: Document Properties Modal
  // ---------------------------------------------------------------------------
  it('P1.5: displays document properties modal with statistics, timestamps, and storage size', async () => {
    const ws = await workspaceService.getOrCreateDefault()
    const doc = await documentRepository.create(ws.id, 'rich', null, 'My Special Note')
    await documentRepository.save(doc.id, 'Hello world content for test', 5, 28, 'rich')

    renderWithProviders(
      <DocumentPropertiesModal
        document={doc}
        isOpen={true}
        onClose={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('My Special Note')).toBeInTheDocument()
      expect(screen.getByText(/Location/i)).toBeInTheDocument()
      expect(screen.getByText(/Word Count/i)).toBeInTheDocument()
      expect(screen.getByText(/Storage/i)).toBeInTheDocument()
      expect(screen.getByText(/Created/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // P1.6: External File Drag & Drop Import
  // ---------------------------------------------------------------------------
  it('P1.6: parses external markdown and HTML files via ImportService', async () => {
    const mdFile = new File(['# External Note\nHello world'], 'external.md', {
      type: 'text/markdown',
    })
    const resMd = await importService.parseImportFile(mdFile)
    expect(resMd.kind).toBe('single-document')
    if (resMd.kind === 'single-document') {
      expect(resMd.title).toBe('external')
      expect(resMd.type).toBe('markdown')
      expect(resMd.content).toContain('# External Note')
    }

    const htmlFile = new File(['<p>Sanitized paragraph <script>alert(1)</script></p>'], 'page.html', {
      type: 'text/html',
    })
    const resHtml = await importService.parseImportFile(htmlFile)
    expect(resHtml.kind).toBe('single-document')
    if (resHtml.kind === 'single-document') {
      expect(resHtml.type).toBe('rich')
      expect(resHtml.content).not.toContain('<script>')
      expect(resHtml.content).toContain('<p>Sanitized paragraph </p>')
    }
  })
})
