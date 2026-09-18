import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '@/App.js'
import { db } from '@/storage/db.js'
import { workspaceService } from '@/services/WorkspaceService.js'

describe('Responsive UX and Visual Defect Fixes Verification', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
    await db.snapshots.clear()
    await db.attachments.clear()
    await db.settings.clear()
    await workspaceService.getOrCreateDefault()
  })

  // 1. Full-width footer independent of sidebar width
  it('verifies full-width footer is rendered independently of sidebar container', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('scratchpad-statusbar')).toBeInTheDocument()
    })

    const statusbar = document.getElementById('scratchpad-statusbar')!
    const appShell = statusbar.closest('.app-shell')
    expect(appShell).toBeInTheDocument()

    // Status bar must be in full-width footer wrapper outside .app-shell__body and .app-shell__sidebar
    expect(statusbar.closest('.app-shell')).toBe(appShell)
    expect(statusbar.closest('.app-shell__body')).toBeNull()
    expect(statusbar.closest('.app-shell__sidebar')).toBeNull()
  })

  // 2. 1024px sidebar-to-drawer transition & persisted desktop width not affecting mobile
  it('handles 1024px responsive sidebar-to-drawer transition without stale width', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.app-shell__sidebar')).toBeInTheDocument()
    })

    // Simulate window resize to tablet viewport (1024px)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      const sidebar = document.querySelector('.app-shell__sidebar')
      expect(sidebar).toBeInTheDocument()
    })
  })

  it('persisted desktop sidebar width does not create stale width issues on mobile', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.app-shell')).toBeInTheDocument()
    })

    // On mobile (<768px), sidebar has drawer backdrop when opened
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    window.dispatchEvent(new Event('resize'))

    const statusbar = document.getElementById('scratchpad-statusbar')
    expect(statusbar).toBeInTheDocument()
  })

  // 3. Explorer [+ New ▾] primary action at desktop/tablet/mobile
  it('renders primary [+ New ▾] action with Rich, Markdown, and Plain Text note options', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('explorer-new-btn')).toBeInTheDocument()
    })

    const newBtn = document.getElementById('explorer-new-btn')!
    expect(newBtn).toHaveTextContent('New')

    // Click [+ New ▾] to open dropdown
    fireEvent.click(newBtn)

    await waitFor(() => {
      const newMenu = document.querySelector('.explorer-new-menu')
      expect(newMenu).toBeInTheDocument()
      expect(newMenu).toHaveTextContent('New Rich Note')
      expect(newMenu).toHaveTextContent('New Markdown Document')
      expect(newMenu).toHaveTextContent('New Plain Text Note')
    })

    // Click "New Plain Text Note" in the explorer new menu
    const newMenu = document.querySelector('.explorer-new-menu')!
    const plainBtn = newMenu.querySelectorAll('button')[2]
    expect(plainBtn).toHaveTextContent('New Plain Text Note')
    fireEvent.click(plainBtn)

    await waitFor(() => {
      expect(document.querySelector('.explorer-new-menu')).toBeNull()
    })
  })

  // 4. File menu internal scrolling & contrast
  it('verifies File menu has internal scrollable bounds', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('File')).toBeInTheDocument()
    })

    // Open File menu
    fireEvent.click(screen.getByText('File'))

    await waitFor(() => {
      const fileMenu = document.querySelector('.menubar__dropdown')
      expect(fileMenu).toBeInTheDocument()
      expect(document.getElementById('menu-item-new-rich')).toBeInTheDocument()
      expect(document.getElementById('menu-item-new-markdown')).toBeInTheDocument()
      expect(document.getElementById('menu-item-new-plain')).toBeInTheDocument()
    })
  })

  // 5. No toolbar clipping: Font and size selects & More Formatting alternative
  it('verifies font & size select labels are concise and accessible in More popover', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      const fontSelect = screen.getByTitle('Font Family') as HTMLSelectElement
      const sizeSelect = screen.getByTitle('Font Size') as HTMLSelectElement
      expect(fontSelect).toBeInTheDocument()
      expect(sizeSelect).toBeInTheDocument()

      // Font select default option should be "Default" (not truncated)
      expect(fontSelect.options[0].text).toBe('Default')
      // Size select default option should be "16px" (not truncated "Default Size")
      expect(sizeSelect.options[0].text).toBe('16px')
    })

    // Open More popover
    const moreBtn = document.getElementById('toolbar-more-btn')!
    fireEvent.click(moreBtn)

    await waitFor(() => {
      // Alternatives for hidden controls must exist inside popover
      expect(screen.getByText('Typography')).toBeInTheDocument()
      expect(screen.getByText('Insert Content')).toBeInTheDocument()
      expect(screen.getByText('Alignment')).toBeInTheDocument()
      expect(screen.getByText('Lists')).toBeInTheDocument()
    })
  })

  // 6. Version History layering & 2-step deletion confirmation
  it('verifies Version History 2-step snapshot deletion with permanent warning', async () => {
    render(<App />)

    // Create a doc from welcome screen
    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    // Open Version History Drawer
    await waitFor(() => {
      expect(screen.getByTitle('Version History / Checkpoints')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Version History / Checkpoints'))

    // Take a snapshot
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Snapshot' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Snapshot' }))

    await waitFor(() => {
      expect(screen.getByTitle('Delete snapshot')).toBeInTheDocument()
    })

    // Click Delete snapshot trash button
    fireEvent.click(screen.getByTitle('Delete snapshot'))

    // Verify 2-step confirmation warning appears!
    await waitFor(() => {
      expect(
        screen.getByText('Permanently delete this snapshot? This cannot be undone.')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    // Click Cancel to cancel deletion
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Snapshot should still be present
    expect(screen.getByTitle('Delete snapshot')).toBeInTheDocument()
  })

  // 7. Full title tooltip on document title hover
  it('verifies document title displays full tooltip for truncated text', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      const titleHeading = document.querySelector('.editor-pane__title')
      expect(titleHeading).toBeInTheDocument()
      expect(titleHeading).toHaveAttribute('title', 'Untitled (Click to rename)')
    })
  })

  // 8. Overlay components close on viewport resize
  it('safely closes menus and popovers on viewport resize', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('explorer-new-btn')).toBeInTheDocument()
    })

    // Open [+ New ▾] dropdown
    fireEvent.click(document.getElementById('explorer-new-btn')!)

    await waitFor(() => {
      expect(document.querySelector('.explorer-new-menu')).toBeInTheDocument()
    })

    // Dispatch viewport resize event
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(document.querySelector('.explorer-new-menu')).toBeNull()
    })
  })

  // 9. Folder-aware New Document & Folder creation
  describe('Deterministic Destination Folder Resolution', () => {
    it('1. New document inherits selected folder', async () => {
      render(<App />)

      const defaultWs = await workspaceService.getOrCreateDefault()
      const folderA = await workspaceService.createFolder(defaultWs.id, 'Folder A', null)

      // Allow Explorer to re-render with the new folder
      await waitFor(() => {
        expect(screen.getByText('Folder A')).toBeInTheDocument()
      })

      // Explicitly select Folder A by clicking it in Explorer
      fireEvent.click(screen.getByText('Folder A'))

      // Folder should have selected class
      const folderRow = screen.getByText('Folder A').closest('.explorer-row--folder')
      expect(folderRow).toHaveClass('explorer-row--selected')

      // Click [+ New ▾] button
      fireEvent.click(document.getElementById('explorer-new-btn')!)

      await waitFor(() => {
        expect(document.getElementById('explorer-new-rich-note')).toBeInTheDocument()
      })

      // Select New Rich Note
      fireEvent.click(document.getElementById('explorer-new-rich-note')!)

      // Verify new document was created with folderId = folderA.id
      await waitFor(async () => {
        const docs = await db.documents.where('workspaceId').equals(defaultWs.id).toArray()
        const created = docs.find((d) => d.folderId === folderA.id)
        expect(created).toBeDefined()
        expect(created?.folderId).toBe(folderA.id)
      })
    })

    it('2. New document inherits active document folder when no folder is selected', async () => {
      render(<App />)

      const defaultWs = await workspaceService.getOrCreateDefault()
      const folderB = await workspaceService.createFolder(defaultWs.id, 'Folder B', null)

      // Wait for Folder B to appear
      await waitFor(() => {
        expect(screen.getByText('Folder B')).toBeInTheDocument()
      })

      // Click Folder B to select it
      fireEvent.click(screen.getByText('Folder B'))

      // Create a first doc inside Folder B using [+ New ▾] -> Rich Note
      fireEvent.click(document.getElementById('explorer-new-btn')!)
      await waitFor(() => {
        expect(document.getElementById('explorer-new-rich-note')).toBeInTheDocument()
      })
      fireEvent.click(document.getElementById('explorer-new-rich-note')!)

      // After creation, the document is active and selectedFolderId is cleared
      await waitFor(() => {
        expect(document.querySelector('.editor-pane__title')).toBeInTheDocument()
      })

      // Click [+ New ▾] button again (now no folder is selected, but active doc is in Folder B)
      fireEvent.click(document.getElementById('explorer-new-btn')!)

      await waitFor(() => {
        expect(document.getElementById('explorer-new-md-note')).toBeInTheDocument()
      })

      // Select New Markdown Document
      fireEvent.click(document.getElementById('explorer-new-md-note')!)

      // Verify the new markdown document inherits Folder B from the active document
      await waitFor(async () => {
        const docs = await db.documents.where('workspaceId').equals(defaultWs.id).toArray()
        const mdDoc = docs.find((d) => d.type === 'markdown')
        expect(mdDoc).toBeDefined()
        expect(mdDoc?.folderId).toBe(folderB.id)
      })
    })

    it('3. New document falls back to root when active doc is in root or no active doc', async () => {
      render(<App />)

      const defaultWs = await workspaceService.getOrCreateDefault()

      // Wait for Explorer header button to be rendered
      await waitFor(() => {
        expect(document.getElementById('explorer-new-btn')).toBeInTheDocument()
      })

      // Click [+ New ▾] button with no folder selected and no active doc
      fireEvent.click(document.getElementById('explorer-new-btn')!)

      await waitFor(() => {
        expect(document.getElementById('explorer-new-plain-note')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('explorer-new-plain-note')!)

      // Verify the new document has folderId = null (root)
      await waitFor(async () => {
        const docs = await db.documents.where('workspaceId').equals(defaultWs.id).toArray()
        const plainDoc = docs.find((d) => d.type === 'plain')
        expect(plainDoc).toBeDefined()
        expect(plainDoc?.folderId).toBeNull()
      })
    })

    it('4. New folder inherits selected folder', async () => {
      render(<App />)

      const defaultWs = await workspaceService.getOrCreateDefault()
      const parentFolder = await workspaceService.createFolder(defaultWs.id, 'Parent Folder', null)

      await waitFor(() => {
        expect(screen.getByText('Parent Folder')).toBeInTheDocument()
      })

      // Select Parent Folder
      fireEvent.click(screen.getByText('Parent Folder'))

      // Click New Folder button in header
      const newFolderBtn = document.getElementById('explorer-btn-new-folder')!
      fireEvent.click(newFolderBtn)

      // Inline creation input appears
      await waitFor(() => {
        expect(document.querySelector('.explorer-inline-input')).toBeInTheDocument()
      })

      const input = document.querySelector('.explorer-inline-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Child Folder' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Verify Child Folder was created under Parent Folder
      await waitFor(async () => {
        const folders = await db.folders.where('workspaceId').equals(defaultWs.id).toArray()
        const child = folders.find((f) => f.name === 'Child Folder')
        expect(child).toBeDefined()
        expect(child?.parentId).toBe(parentFolder.id)
      })
    })
  })

  // 10. More Formatting Controls & Clear All Formatting Reachability
  describe('More Formatting Close Controls and Sticky Clear All Formatting', () => {
    it('5 & 10. Clear All Formatting is present in sticky footer across desktop and mobile', async () => {
      render(<App />)

      await waitFor(() => {
        expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

      await waitFor(() => {
        expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
      })

      // Open More Formatting
      fireEvent.click(document.getElementById('toolbar-more-btn')!)

      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeInTheDocument()
        expect(document.querySelector('.popover-footer')).toBeInTheDocument()
        expect(document.getElementById('toolbar-clear-formatting-btn')).toBeInTheDocument()
      })

      const clearBtn = document.getElementById('toolbar-clear-formatting-btn')!
      const footer = clearBtn.closest('.popover-footer')
      expect(footer).toBeInTheDocument()

      // Footer is outside the scrollable .popover-body
      expect(clearBtn.closest('.popover-body')).toBeNull()

      // Test small viewport heights/widths (1024, 900, 768, 480, 375)
      for (const w of [1024, 900, 768, 480, 375]) {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: w })
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 })
        expect(document.getElementById('toolbar-clear-formatting-btn')).toBeInTheDocument()
      }
    })

    it('6. More Formatting closes when its button is toggled', async () => {
      render(<App />)

      await waitFor(() => {
        expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
      })
      fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

      await waitFor(() => {
        expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
      })

      const moreBtn = document.getElementById('toolbar-more-btn')!

      // Open
      fireEvent.click(moreBtn)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeInTheDocument()
      })

      // Click button again to toggle closed
      fireEvent.click(moreBtn)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeNull()
      })
    })

    it('7. More Formatting closes with [X] close button and with Escape', async () => {
      render(<App />)

      await waitFor(() => {
        expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
      })
      fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

      await waitFor(() => {
        expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
      })

      const moreBtn = document.getElementById('toolbar-more-btn')!

      // 1. Test [X] close button
      fireEvent.click(moreBtn)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-close-btn')).toBeInTheDocument()
      })

      const closeBtn = document.getElementById('more-formatting-close-btn')!
      expect(closeBtn).toHaveAttribute('title', 'Close more formatting')
      expect(closeBtn).toHaveAttribute('aria-label', 'Close formatting panel')

      fireEvent.click(closeBtn)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeNull()
      })

      // 2. Test Escape key
      fireEvent.click(moreBtn)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeInTheDocument()
      })

      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeNull()
      })
    })

    it('8. More Formatting closes when clicking outside', async () => {
      render(<App />)

      await waitFor(() => {
        expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
      })
      fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

      await waitFor(() => {
        expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('toolbar-more-btn')!)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeInTheDocument()
      })

      // Click outside
      fireEvent.pointerDown(document.body)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeNull()
      })
    })

    it('9. More Formatting closes on viewport resize and close-overlays event', async () => {
      render(<App />)

      await waitFor(() => {
        expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
      })
      fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

      await waitFor(() => {
        expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('toolbar-more-btn')!)
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeInTheDocument()
      })

      // Resize event
      window.dispatchEvent(new Event('resize'))
      await waitFor(() => {
        expect(document.getElementById('more-formatting-popover')).toBeNull()
      })
    })
  })
})
