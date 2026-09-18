import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '@/App'
import { db } from '@/storage/db'

describe('AppShell & IDE Shell (Phase 2)', () => {
  beforeEach(async () => {
    await db.documents.clear()
    await db.folders.clear()
    await db.workspaces.clear()
    await db.settings.clear()
  })

  it('renders IDE shell with MenuBar, Explorer, TabBar, and StatusBar', async () => {
    render(<App />)

    // Wait for DB initialization and workspace loading
    await waitFor(() => {
      expect(screen.getByLabelText('Application Menu')).toBeInTheDocument()
    })

    // MenuBar items
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument()

    // Explorer Sidebar
    expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()

    // StatusBar
    expect(screen.getByLabelText('Status bar')).toBeInTheDocument()
    expect(screen.getByText('Saved locally')).toBeInTheDocument()
  })

  it('opens and closes Command Palette via Ctrl+Shift+P', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Application Menu')).toBeInTheDocument()
    })

    // Palette should initially be closed
    expect(screen.queryByLabelText('Command Palette')).not.toBeInTheDocument()

    // Press Ctrl+Shift+P (window target)
    fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Command Palette')).toBeInTheDocument()
    })

    // Search inside Command Palette
    const input = screen.getByPlaceholderText(/Type a command/i)
    fireEvent.change(input, { target: { value: 'Markdown' } })

    const palette = screen.getByLabelText('Command Palette')
    expect(within(palette).getByText('New Markdown Document')).toBeInTheDocument()

    // Close via Escape
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByLabelText('Command Palette')).not.toBeInTheDocument()
    })
  })

  it('creates and displays new document tabs', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Application Menu')).toBeInTheDocument()
    })

    // Click "New Document" on Welcome Screen by ID
    const newDocBtn = document.getElementById('welcome-create-rich-doc')!
    fireEvent.click(newDocBtn)

    await waitFor(() => {
      // TabBar should now have an active tab
      const tab = screen.getByRole('tab', { name: /Untitled/i })
      expect(tab).toBeInTheDocument()
      expect(tab).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('toggles sidebar via Explorer button in StatusBar', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
    })

    // Toggle off via StatusBar button
    const toggleBtn = screen.getByRole('button', { name: /Toggle Explorer/i })
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(screen.queryByLabelText('Workspace Explorer')).not.toBeInTheDocument()
    })

    // Toggle back on via StatusBar button
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
    })
  })

  it('does not intercept editor-native Ctrl+B, leaving it for editor bold formatting', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
    })

    // Fire Ctrl+B event — sidebar should NOT be affected
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, cancelable: true })
    window.dispatchEvent(event)

    // Event should NOT have defaultPrevented called by global shortcuts
    expect(event.defaultPrevented).toBe(false)
    expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
  })

  it('toggles focus mode via Ctrl+Shift+F', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
    })

    // Press Ctrl+Shift+F to enter focus mode
    fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true })

    await waitFor(() => {
      // In focus mode, sidebar should be hidden
      expect(screen.queryByLabelText('Workspace Explorer')).not.toBeInTheDocument()
    })

    // Press Ctrl+Shift+F again to exit focus mode
    fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true })

    await waitFor(() => {
      expect(screen.getByLabelText('Workspace Explorer')).toBeInTheDocument()
    })
  })
})
