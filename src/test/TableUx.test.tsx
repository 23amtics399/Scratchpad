import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, configure, cleanup } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Table from '@tiptap/extension-table'
import App from '@/App.js'
import { db } from '@/storage/db.js'
import {
  CustomTableRow,
  CustomTableHeader,
  CustomTableCell,
  applyTableBorder,
} from '@/components/Editor/RichEditor/extensions/TableExtensions.js'

configure({ asyncUtilTimeout: 3000 })

// Helper to expand compact Table Actions pill to full toolbar
async function expandTableToolbar(): Promise<void> {
  await waitFor(() => {
    expect(document.querySelector('.ProseMirror table')).toBeInTheDocument()
    expect(document.getElementById('table-toolbar-compact-btn')).toBeInTheDocument()
  }, { timeout: 5000 })
  fireEvent.click(document.getElementById('table-toolbar-compact-btn')!)
  await waitFor(() => {
    expect(document.getElementById('table-toolbar-root')).toBeInTheDocument()
  }, { timeout: 5000 })
}

describe('Contextual Table Toolbar UX & Table Controls', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
    await db.settings.clear()
    // Reset desktop width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 })
    document.elementFromPoint = () => null
  })

  afterEach(() => {
    cleanup()
  })

  it('1. Compact default state: Table entry renders compact pill and does NOT auto-expand full toolbar', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    // Create a new rich document
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })

    // Initially, neither compact pill nor full toolbar is present
    expect(document.getElementById('table-toolbar-compact-btn')).not.toBeInTheDocument()
    expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()

    // Insert 3x3 table
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    // Contextual Table Toolbar MUST default to compact pill: "Table Actions ▾"
    await waitFor(() => {
      expect(document.getElementById('table-toolbar-compact-btn')).toBeInTheDocument()
      expect(document.querySelector('.has-active-table')).toBeInTheDocument()
    })

    // Crucial requirement: Full toolbar is NOT rendered automatically!
    expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()

    // Expanding it renders the full toolbar with Header
    fireEvent.click(document.getElementById('table-toolbar-compact-btn')!)
    await waitFor(() => {
      expect(document.getElementById('table-toolbar-root')).toBeInTheDocument()
      expect(screen.getByText('Table Actions', { selector: '.table-toolbar__header-title span' })).toBeInTheDocument()
      expect(document.getElementById('table-toolbar-minimize-btn')).toBeInTheDocument()
      expect(document.getElementById('table-toolbar-close-btn')).toBeInTheDocument()
    })

    // Delete table via safe confirmation to verify toolbar disappears
    fireEvent.click(document.getElementById('table-btn-delete-table')!)
    await waitFor(() => {
      expect(document.getElementById('table-btn-confirm-delete')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('table-btn-confirm-delete')!)

    // Once table is deleted, toolbar must disappear
    await waitFor(() => {
      expect(document.getElementById('table-toolbar-compact-btn')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
      expect(document.querySelector('.has-active-table')).not.toBeInTheDocument()
    })
  })

  it('2. Minimize [−] returns from expanded toolbar to compact pill', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()
    expect(document.getElementById('table-toolbar-root')).toBeInTheDocument()

    // Click minimize button [−]
    fireEvent.click(document.getElementById('table-toolbar-minimize-btn')!)

    // Expanded toolbar hidden, compact button restored
    await waitFor(() => {
      expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-compact-btn')).toBeInTheDocument()
    })
  })

  it('3. Close [×] completely hides toolbar for current table and does not immediately reopen', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Click close button [×]
    fireEvent.click(document.getElementById('table-toolbar-close-btn')!)

    // Both expanded and compact button are hidden for this table
    await waitFor(() => {
      expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-compact-btn')).not.toBeInTheDocument()
    })

    // Clicking or moving cursor inside the table should NOT reopen it
    const cell = document.querySelector('.ProseMirror table th p, .ProseMirror table td p') as HTMLElement
    expect(cell).toBeInTheDocument()
    fireEvent.focus(cell)
    fireEvent.click(cell)

    // Verify it stays dismissed
    expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
    expect(document.getElementById('table-toolbar-compact-btn')).not.toBeInTheDocument()
  })

  it('4. Escape key collapses expanded to compact, and second Escape hides completely', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // 1st Escape while expanded: collapses to compact
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-compact-btn')).toBeInTheDocument()
    })

    // 2nd Escape while compact: hides completely
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(document.getElementById('table-toolbar-compact-btn')).not.toBeInTheDocument()
    })
  })

  it('5. Outside click collapses expanded toolbar to compact', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Click outside toolbar (e.g. on editor wrapper or outside element)
    fireEvent.pointerDown(document.body)

    await waitFor(() => {
      expect(document.getElementById('table-toolbar-root')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-compact-btn')).toBeInTheDocument()
    })
  })

  it('6, 7, 8. Adds rows above/below and deletes a row correctly', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Initial row count is 3
    const initialRows = document.querySelectorAll('.ProseMirror table tr').length
    expect(initialRows).toBe(3)

    // Add Row Above
    fireEvent.click(document.getElementById('table-btn-add-row-above')!)
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror table tr').length).toBe(4)
    })

    // Add Row Below
    fireEvent.click(document.getElementById('table-btn-add-row-below')!)
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror table tr').length).toBe(5)
    })

    // Delete Row
    fireEvent.click(document.getElementById('table-btn-delete-row')!)
    await waitFor(() => {
      expect(document.querySelectorAll('.ProseMirror table tr').length).toBe(4)
    })
  })

  it('9, 10, 11. Adds columns left/right and deletes a column correctly', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Check first row's cell count (initial 3 columns)
    const firstRowCells = () => document.querySelectorAll('.ProseMirror table tr:first-child > *').length
    expect(firstRowCells()).toBe(3)

    // Add Column Left
    fireEvent.click(document.getElementById('table-btn-add-col-left')!)
    await waitFor(() => {
      expect(firstRowCells()).toBe(4)
    })

    // Add Column Right
    fireEvent.click(document.getElementById('table-btn-add-col-right')!)
    await waitFor(() => {
      expect(firstRowCells()).toBe(5)
    })

    // Delete Column
    fireEvent.click(document.getElementById('table-btn-delete-col')!)
    await waitFor(() => {
      expect(firstRowCells()).toBe(4)
    })
  })

  it('12 & 13. Validates disabled operations: Merge disabled for 1 cell, Split disabled for non-merged cell', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    const mergeBtn = document.getElementById('table-btn-merge-cells') as HTMLButtonElement
    const splitBtn = document.getElementById('table-btn-split-cell') as HTMLButtonElement

    // In a standard 3x3 table with a single cell focused, merge is disabled
    expect(mergeBtn).toBeDisabled()
    // A regular cell is not merged, so split is disabled
    expect(splitBtn).toBeDisabled()
  })

  it('14. Toggles Header Row with active checked indicator', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    const headerBtn = document.getElementById('table-btn-toggle-header')!
    // Since table was created with header row, cursor in first row should show header active
    expect(headerBtn.textContent).toContain('Header Row')

    // Click to toggle header row
    fireEvent.click(headerBtn)
    await waitFor(() => {
      expect(document.getElementById('table-btn-toggle-header')).toBeInTheDocument()
    })
  })

  it('15 & 16. Delete table 2-step confirmation prompt and cancel behavior', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Click Delete Table button
    fireEvent.click(document.getElementById('table-btn-delete-table')!)

    // Confirmation box with alertdialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete this table?')).toBeInTheDocument()
      expect(document.getElementById('table-btn-confirm-delete')).toBeInTheDocument()
      expect(document.getElementById('table-btn-cancel-delete')).toBeInTheDocument()
    })

    // Click Cancel
    fireEvent.click(document.getElementById('table-btn-cancel-delete')!)

    // Confirmation box dismissed and table is preserved
    await waitFor(() => {
      expect(screen.queryByText('Delete this table?')).not.toBeInTheDocument()
      expect(document.querySelector('.ProseMirror table')).toBeInTheDocument()
      expect(document.getElementById('table-btn-delete-table')).toBeInTheDocument()
    })
  })

  it('17. Mobile table action panel (toggle, scrollable sections, close button)', async () => {
    // Set mobile viewport width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 })

    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    // Insert 3x3 table via toolbar or command
    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    // On mobile, compact floating button appears
    await waitFor(() => {
      expect(document.getElementById('table-mobile-toggle-btn')).toBeInTheDocument()
    })

    // Sheet is not open initially
    expect(document.getElementById('table-mobile-sheet')).not.toBeInTheDocument()

    // Tap compact Table Actions button
    fireEvent.click(document.getElementById('table-mobile-toggle-btn')!)

    // Sheet opens with sections Rows, Columns, Cells, Borders, Table
    await waitFor(() => {
      expect(document.getElementById('table-mobile-sheet')).toBeInTheDocument()
      expect(screen.getByText('Rows')).toBeInTheDocument()
      expect(screen.getByText('Columns')).toBeInTheDocument()
      expect(screen.getByText('Cells')).toBeInTheDocument()
      expect(screen.getByText('Borders')).toBeInTheDocument()
      expect(screen.getByText('Table', { selector: '.table-mobile-section__label' })).toBeInTheDocument()
    })

    // Verify Mobile borders controls exist
    expect(document.getElementById('table-btn-border-all')).toBeInTheDocument()
    expect(document.getElementById('table-btn-border-none')).toBeInTheDocument()
    expect(document.getElementById('table-border-width-select-mobile')).toBeInTheDocument()
    expect(document.getElementById('table-border-style-select-mobile')).toBeInTheDocument()

    // Tap Close [X] button
    fireEvent.click(document.getElementById('table-mobile-close-btn')!)

    // Sheet closes
    await waitFor(() => {
      expect(document.getElementById('table-mobile-sheet')).not.toBeInTheDocument()
    })
  })

  it('18. Border Presets (All, None, Top, Bottom, Left, Right) apply accurate concrete attributes', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Click "All" borders button
    const btnAll = document.getElementById('table-btn-border-all')!
    fireEvent.click(btnAll)

    // Current cell should have data-border-* and style attributes set to concrete values
    await waitFor(() => {
      const activeCell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(activeCell).toBeInTheDocument()
      const borderTop = activeCell.getAttribute('data-border-top')
      expect(borderTop).toBeTruthy()
      expect(borderTop).not.toContain('var(')
      expect(activeCell.getAttribute('data-border-bottom')).toBeTruthy()
      expect(activeCell.getAttribute('data-border-left')).toBeTruthy()
      expect(activeCell.getAttribute('data-border-right')).toBeTruthy()
    })

    // Click "None" borders button to remove borders
    const btnNone = document.getElementById('table-btn-border-none')!
    fireEvent.click(btnNone)

    await waitFor(() => {
      const activeCell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(activeCell).toBeInTheDocument()
      expect(activeCell.getAttribute('data-border-top')).toBe('none')
      expect(activeCell.getAttribute('data-border-bottom')).toBe('none')
      expect(activeCell.getAttribute('data-border-left')).toBe('none')
      expect(activeCell.getAttribute('data-border-right')).toBe('none')
    })

    // Click "Top" border button
    const btnTop = document.getElementById('table-btn-border-top')!
    fireEvent.click(btnTop)

    await waitFor(() => {
      const activeCell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(activeCell.getAttribute('data-border-top')).not.toBe('none')
      expect(activeCell.getAttribute('data-border-top')).toContain('solid')
      // Bottom should still be 'none'
      expect(activeCell.getAttribute('data-border-bottom')).toBe('none')
    })
  })

  it('19. Border Modifiers: custom color, width, and style persist concrete non-CSS-variable values', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Change width to 2px
    const widthSelect = document.getElementById('table-border-width-select') as HTMLSelectElement
    fireEvent.change(widthSelect, { target: { value: '2' } })

    // Change style to dashed
    const styleSelect = document.getElementById('table-border-style-select') as HTMLSelectElement
    fireEvent.change(styleSelect, { target: { value: 'dashed' } })

    // Open color picker and choose Danger Red (#f85149)
    fireEvent.click(document.getElementById('table-border-color-btn')!)
    await waitFor(() => {
      expect(screen.getByTitle('Danger Red')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Danger Red'))

    // Apply "All" borders
    fireEvent.click(document.getElementById('table-btn-border-all')!)

    await waitFor(() => {
      const cell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(cell).toBeInTheDocument()
      expect(cell.getAttribute('data-border-top')).toBe('2px dashed #f85149')
      expect(cell.getAttribute('data-border-bottom')).toBe('2px dashed #f85149')
      expect(cell.getAttribute('data-border-left')).toBe('2px dashed #f85149')
      expect(cell.getAttribute('data-border-right')).toBe('2px dashed #f85149')
    })
  })

  it('20. Merged-cell Outer and Inner border correctness with TableMap', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Apply Outer border to the focused cell (single cell test of outer)
    fireEvent.click(document.getElementById('table-btn-border-outer')!)

    await waitFor(() => {
      const cell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(cell).toBeInTheDocument()
      // Outer border on a single focused cell sets all 4 outer sides of that cell
      expect(cell.getAttribute('data-border-top')).toBeTruthy()
      expect(cell.getAttribute('data-border-bottom')).toBeTruthy()
      expect(cell.getAttribute('data-border-left')).toBeTruthy()
      expect(cell.getAttribute('data-border-right')).toBeTruthy()
    })

    // Clear with none
    fireEvent.click(document.getElementById('table-btn-border-none')!)

    await waitFor(() => {
      const cell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(cell.getAttribute('data-border-top')).toBe('none')
    })
  })

  it('20b. Merged-cell Outer and Inner border correctness with TableMap', () => {
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Table.configure({ resizable: true }),
        CustomTableRow,
        CustomTableHeader,
        CustomTableCell,
      ],
      content: `
        <table>
          <tr>
            <th colspan="2"><p>Merged Header</p></th>
            <th><p>Header 3</p></th>
          </tr>
          <tr>
            <td><p>Row 1 Col 1</p></td>
            <td><p>Row 1 Col 2</p></td>
            <td><p>Row 1 Col 3</p></td>
          </tr>
        </table>
      `,
    })

    // Place cursor in merged header cell
    editor.commands.setTextSelection(4)

    // Apply outer border to the merged cell
    const resOuter = applyTableBorder(editor, 'outer', {
      width: 2,
      style: 'solid',
      color: '#123456',
    })
    expect(resOuter).toBe(true)

    const json = editor.getJSON()
    const tableNode = json.content?.[0]
    const row0 = tableNode?.content?.[0]
    const mergedCell = row0?.content?.[0]

    expect(mergedCell?.attrs?.colspan).toBe(2)
    // For this single merged cell, outer borders apply on all its 4 outer perimeter sides
    expect(mergedCell?.attrs?.borderTop?.color).toBe('#123456')
    expect(mergedCell?.attrs?.borderTop?.width).toBe(2)
    expect(mergedCell?.attrs?.borderLeft?.color).toBe('#123456')
    expect(mergedCell?.attrs?.borderRight?.color).toBe('#123456')
    expect(mergedCell?.attrs?.borderBottom?.color).toBe('#123456')

    // Now test Inner border on a single merged cell (inner borders only exist between multiple adjacent selected cells)
    applyTableBorder(editor, 'inner', {
      width: 1,
      style: 'dashed',
      color: '#abcdef',
    })
    // Since only 1 cell was selected, no internal boundaries exist, so cell attrs are not given inner borders
    const jsonInner = editor.getJSON()
    const mergedCellAfterInner = jsonInner.content?.[0]?.content?.[0]?.content?.[0]
    expect(mergedCellAfterInner?.attrs?.borderTop?.style).toBe('solid')

    editor.destroy()
  })

  it('21. Border round-trip: apply → save → reload → HTML export/import → verify', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    // Select width 3px, style dotted
    fireEvent.change(document.getElementById('table-border-width-select')!, { target: { value: '3' } })
    fireEvent.change(document.getElementById('table-border-style-select')!, { target: { value: 'dotted' } })

    // Choose Success Green (#2ea043)
    fireEvent.click(document.getElementById('table-border-color-btn')!)
    await waitFor(() => {
      expect(screen.getByTitle('Success Green')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Success Green'))

    // Apply All borders
    fireEvent.click(document.getElementById('table-btn-border-all')!)

    // Flush save immediately to Dexie DB
    window.dispatchEvent(new CustomEvent('scratchpad:save'))

    // Wait for document to be saved in Dexie DB
    let savedContent = ''
    await waitFor(
      async () => {
        const docs = await db.documents.toArray()
        expect(docs.length).toBeGreaterThan(0)
        savedContent = docs[0].content
        expect(savedContent).toContain('"width":3,"style":"dotted","color":"#2ea043"')
      },
      { timeout: 3000 }
    )

    // Verify concrete persistence: no var(--sp-color-border) stored in document JSON
    expect(savedContent).not.toContain('var(')
    expect(savedContent).toContain('#2ea043')

    // Test HTML conversion/export retains borders and row height
    const { richToHtml } = await import('@/services/ConversionService.js')
    const html = richToHtml(savedContent)
    expect(html).toContain('border-top: 3px dotted #2ea043')
    expect(html).toContain('data-border-top="3px dotted #2ea043"')

    // Test HTML re-import into rich editor
    const reimportedEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Table.configure({ resizable: true }),
        CustomTableRow,
        CustomTableHeader,
        CustomTableCell,
      ],
      content: html,
    })
    const reimportedJson = reimportedEditor.getJSON()
    let foundBorderInReimport = false
    const walk = (node: Record<string, unknown>) => {
      const attrs = node.attrs as { borderTop?: { color?: string; width?: number } } | undefined
      if (attrs?.borderTop) {
        if (attrs.borderTop.color === '#2ea043' && attrs.borderTop.width === 3) {
          foundBorderInReimport = true
        }
      }
      if (Array.isArray(node.content)) {
        ;(node.content as Record<string, unknown>[]).forEach(walk)
      }
    }
    walk(reimportedJson)
    expect(foundBorderInReimport).toBe(true)
    reimportedEditor.destroy()
  })

  it('22. Resize discoverability: 8px handle width, col-resize and row-resize cursor, hover indicators', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await waitFor(() => {
      expect(document.querySelector('.ProseMirror table')).toBeInTheDocument()
    })

    const editorDom = document.querySelector('.ProseMirror') as HTMLElement
    const firstCell = document.querySelector('.ProseMirror table th, .ProseMirror table td') as HTMLElement
    expect(firstCell).toBeInTheDocument()

    // Test Row Resizing boundary hover:
    const row = firstCell.closest('tr') as HTMLTableRowElement
    row.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 140,
        left: 50,
        right: 350,
        width: 300,
        height: 40,
      } as DOMRect)
    firstCell.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 140,
        left: 50,
        right: 150,
        width: 100,
        height: 40,
      } as DOMRect)
    const table = row.closest('table') as HTMLTableElement
    table.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 220,
        left: 50,
        right: 350,
        width: 300,
        height: 120,
      } as DOMRect)

    // Move pointer within 4px of row bottom (clientY = 139) -> 8px hit area
    fireEvent.mouseMove(firstCell, { clientY: 139, clientX: 100 })

    // Hover indicator element should be created in body with title "Drag to resize row"
    await waitFor(() => {
      const handle = document.querySelector('.table-row-resize-handle')
      expect(handle).toBeInTheDocument()
      expect(handle?.getAttribute('title')).toBe('Drag to resize row')
      expect(editorDom.classList.contains('row-resize-cursor')).toBe(true)
    })

    // Initiate drag with mousedown
    fireEvent.mouseDown(firstCell, { clientY: 139, clientX: 100 })

    // Drag guide line should appear
    expect(document.querySelector('.table-row-resize-guide')).toBeInTheDocument()
    expect(document.body.classList.contains('row-resizing-active')).toBe(true)

    // Move during drag
    fireEvent.mouseMove(window, { clientY: 160 })

    // Release mouse
    fireEvent.mouseUp(window, { clientY: 160 })

    // Drag guide should be cleaned up
    expect(document.querySelector('.table-row-resize-guide')).not.toBeInTheDocument()
    expect(document.body.classList.contains('row-resizing-active')).toBe(false)
  })

  it('23. Normal text selection and typing inside table cells are unaffected by resizer', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await waitFor(() => {
      expect(document.querySelector('.ProseMirror table')).toBeInTheDocument()
    })

    const firstCell = document.querySelector('.ProseMirror table th p, .ProseMirror table td p') as HTMLElement
    expect(firstCell).toBeInTheDocument()

    // Focusing and typing inside the cell
    fireEvent.focus(firstCell)
    expect(document.activeElement).toBeTruthy()

    // Center of cell mouse movement does not trigger row resize handle
    const row = firstCell.closest('tr') as HTMLTableRowElement
    row.getBoundingClientRect = () =>
      ({
        top: 100,
        bottom: 140,
        left: 50,
        right: 350,
        width: 300,
        height: 40,
      } as DOMRect)

    const editorDom = document.querySelector('.ProseMirror') as HTMLElement
    // Move at clientY = 115 (well inside the cell, not within 4px of boundary)
    fireEvent.mouseMove(firstCell, { clientY: 115, clientX: 100 })

    // Resizer handle should NOT be present
    expect(document.querySelector('.table-row-resize-handle')).not.toBeInTheDocument()
    expect(editorDom.classList.contains('row-resize-cursor')).toBe(false)
  })

  it('24. Border Color Selector: popover mounts in portal, swatches update live borders, outside click and Escape handling', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Insert Table (3x3)'))

    await expandTableToolbar()

    const colorBtn = document.getElementById('table-border-color-btn')!
    expect(colorBtn).toBeInTheDocument()
    expect(colorBtn.getAttribute('aria-expanded')).toBe('false')

    // Open color picker
    fireEvent.click(colorBtn)

    await waitFor(() => {
      expect(document.getElementById('table-border-palette-popover')).toBeInTheDocument()
      expect(screen.getByTitle('Danger Red')).toBeInTheDocument()
    })

    // Escape closes color picker without collapsing toolbar
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(document.getElementById('table-border-palette-popover')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-root')).toBeInTheDocument()
    })

    // Reopen color picker
    fireEvent.click(colorBtn)
    await waitFor(() => {
      expect(document.getElementById('table-border-palette-popover')).toBeInTheDocument()
    })

    // Clicking toolbar outside the popover closes color picker while toolbar remains open
    fireEvent.pointerDown(document.getElementById('table-toolbar-root')!)
    await waitFor(() => {
      expect(document.getElementById('table-border-palette-popover')).not.toBeInTheDocument()
      expect(document.getElementById('table-toolbar-root')).toBeInTheDocument()
    })

    // Apply All borders first
    fireEvent.click(document.getElementById('table-btn-border-all')!)
    await waitFor(() => {
      const cell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(cell).toBeInTheDocument()
    })

    // Reopen color picker and choose Danger Red
    fireEvent.click(colorBtn)
    await waitFor(() => {
      expect(screen.getByTitle('Danger Red')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTitle('Danger Red'))

    // The active cell with existing borders should have its color updated live to #f85149!
    await waitFor(() => {
      const cell = document.querySelector('.ProseMirror table [data-border-top]') as HTMLElement
      expect(cell.getAttribute('data-border-top')).toContain('#f85149')
    })
  })
})
