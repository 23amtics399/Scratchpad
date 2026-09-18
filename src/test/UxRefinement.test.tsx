import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '@/App.js'
import { db } from '@/storage/db.js'
import { workspaceRepository } from '@/storage/repositories/index.js'
import { DEFAULT_SETTINGS } from '@/types/document.js'

describe('UX/UI Refinement Pass Verification', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
    await db.delete()
    await db.open()
    await workspaceRepository.create('UX Refinement Workspace')
  })

  it('verifies default sidebar width is set to 270px in settings', () => {
    expect(DEFAULT_SETTINGS.sidebarWidth).toBe(270)
  })

  it('renders the draggable sidebar resizer with proper accessibility attributes', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('sidebar-resizer')).toBeInTheDocument()
    })

    const resizer = document.getElementById('sidebar-resizer')!
    expect(resizer).toHaveAttribute('role', 'separator')
    expect(resizer).toHaveAttribute('aria-orientation', 'vertical')
    expect(resizer).toHaveAttribute('aria-label', 'Resize sidebar')
  })

  it('renders the refactored flexible status bar layout with correct document flow', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('scratchpad-statusbar')).toBeInTheDocument()
    })

    // Click "New Rich Document" from welcome screen
    const newRichBtn = document.getElementById('welcome-create-rich-doc')
    expect(newRichBtn).toBeInTheDocument()
    fireEvent.click(newRichBtn!)

    await waitFor(() => {
      expect(document.getElementById('statusbar-toggle-sidebar')).toBeInTheDocument()
      expect(screen.getByText('Rich Text')).toBeInTheDocument()
      expect(screen.getByText('Saved locally')).toBeInTheDocument()
      expect(document.getElementById('statusbar-word-count')).toBeInTheDocument()
      expect(document.getElementById('statusbar-char-count')).toBeInTheDocument()
      expect(document.getElementById('statusbar-toggle-theme')).toBeInTheDocument()
    })
  })

  it('renders the refined toolbar with common visible tools and More Formatting popover', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      // Always-visible common tools
      expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument()
      expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument()
      expect(screen.getByTitle('Font Family')).toBeInTheDocument()
      expect(screen.getByTitle('Font Size')).toBeInTheDocument()
      expect(screen.getByTitle('Paragraph or Heading')).toBeInTheDocument()
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument()
      expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument()
      expect(screen.getByTitle('Underline (Ctrl+U)')).toBeInTheDocument()
      expect(screen.getByTitle('Strikethrough')).toBeInTheDocument()
      expect(screen.getByTitle('Align Left')).toBeInTheDocument()
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument()

      // Grouped insert actions
      expect(screen.getByTitle('Insert / Edit Link')).toBeInTheDocument()
      expect(screen.getByTitle('Insert Image')).toBeInTheDocument()
      expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
      expect(screen.getByTitle('Code Block')).toBeInTheDocument()
      expect(screen.getByTitle('Quote Block')).toBeInTheDocument()
      expect(screen.getByTitle('Horizontal Divider')).toBeInTheDocument()
      expect(screen.getByTitle('Insert Callout Note')).toBeInTheDocument()

      // More Formatting button
      expect(document.getElementById('toolbar-more-btn')).toBeInTheDocument()
    })

    // Click "More Formatting" popover trigger
    const moreBtn = document.getElementById('toolbar-more-btn')!
    fireEvent.click(moreBtn)

    // Verify desktop-styled More Formatting popover contents
    await waitFor(() => {
      expect(screen.getByText('More Formatting')).toBeInTheDocument()
      expect(screen.getByText('Colors')).toBeInTheDocument()
      expect(screen.getByText('Character & Indentation')).toBeInTheDocument()
      expect(screen.getByText('Line & Paragraph Spacing')).toBeInTheDocument()
      expect(screen.getByText('X² Superscript')).toBeInTheDocument()
      expect(screen.getByText('X₂ Subscript')).toBeInTheDocument()
      expect(screen.getByText('Clear All Formatting')).toBeInTheDocument()
    })

    // Clicking Clear Formatting invokes editor command
    const clearBtn = document.getElementById('toolbar-clear-formatting-btn')!
    fireEvent.click(clearBtn)
  })
})
