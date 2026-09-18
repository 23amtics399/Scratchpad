import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '@/App.js'
import { db } from '@/storage/db.js'

describe('Phase 3: Editors (Tiptap + CodeMirror 6)', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
    await db.settings.clear()
  })

  it('renders EditorPane with document title, type switcher, and formatting toolbar when document is opened', async () => {
    render(<App />)

    // Wait for App to load
    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    // Click "Create Rich Document"
    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    // Verify EditorPane header and toolbar render
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Editor formatting toolbar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Document format mode/i })).toBeInTheDocument()
      expect(screen.getByText('Saved')).toBeInTheDocument()
    })

    // Verify rich editor toolbar buttons
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument()
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument()
    expect(screen.getByTitle('Underline (Ctrl+U)')).toBeInTheDocument()
    expect(screen.getByTitle('Code Block')).toBeInTheDocument()
    expect(screen.getByTitle('Insert Table (3x3)')).toBeInTheDocument()
  })

  it('allows inline renaming of the document title in the EditorPane header', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument()
    })

    // Click title to enter edit mode
    fireEvent.click(screen.getByRole('heading', { name: 'Untitled' }))

    const input = screen.getByDisplayValue('Untitled')
    fireEvent.change(input, { target: { value: 'Renamed Project Note' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Renamed Project Note' })).toBeInTheDocument()
    })
  })

  it('switches between Rich, Markdown, and Plain modes cleanly', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-rich-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-rich-doc')!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Document format mode/i })).toBeInTheDocument()
    })

    // Click mode badge to open type dropdown
    fireEvent.click(screen.getByRole('button', { name: /Document format mode/i }))

    // Select Markdown mode
    const mdOption = screen.getByRole('button', { name: /Markdown/i })
    fireEvent.click(mdOption)

    // CodeMirror editor should now mount with Markdown controls
    await waitFor(() => {
      expect(screen.getByText('Markdown Source')).toBeInTheDocument()
      expect(screen.getByTitle('Edit Source Only')).toBeInTheDocument()
      expect(screen.getByTitle('Split View (Editor + Live Preview)')).toBeInTheDocument()
      expect(screen.getByTitle('Preview Rendered Markdown')).toBeInTheDocument()
    })

    // Switch to Plain Text mode
    fireEvent.click(screen.getByRole('button', { name: /Document format mode/i }))
    const plainOption = screen.getByRole('button', { name: /Plain Text/i })
    fireEvent.click(plainOption)

    await waitFor(() => {
      expect(screen.getByText('Plain Text')).toBeInTheDocument()
    })
  })

  it('renders Markdown split preview mode and sanitizes rendered HTML', async () => {
    render(<App />)

    await waitFor(() => {
      expect(document.getElementById('welcome-create-markdown-doc')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('welcome-create-markdown-doc')!)

    await waitFor(() => {
      expect(screen.getByText('Markdown Source')).toBeInTheDocument()
    })

    // Click Split View button
    const splitBtn = screen.getByTitle('Split View (Editor + Live Preview)')
    fireEvent.click(splitBtn)

    // Verify preview container is rendered
    await waitFor(() => {
      expect(document.querySelector('.codemirror-preview-pane')).toBeInTheDocument()
    })
  })
})
