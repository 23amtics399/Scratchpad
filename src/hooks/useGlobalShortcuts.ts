import { useEffect } from 'react'
import { useUI } from '@/contexts/UIContext.js'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'

/**
 * Centralized global keyboard shortcut handler for Scratchpad application.
 *
 * Strict Conceptual Separation:
 *
 * 1. Editor-native shortcuts — MUST NEVER BE INTERCEPTED:
 *    - Ctrl+B (Bold)
 *    - Ctrl+I (Italic)
 *    - Ctrl+U (Underline)
 *    - Ctrl+Z (Undo)
 *    - Ctrl+Shift+Z / Ctrl+Y (Redo)
 *    - Standard text editing/navigation (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Arrow keys, etc.)
 *
 * 2. Application-level shortcuts:
 *    - Ctrl+Shift+P → Command Palette
 *    - Ctrl+S       → Save/flush active document (prevent browser save)
 *    - Ctrl+N       → New document (prevent browser new window)
 *    - Ctrl+W       → Close Scratchpad active tab (prevent browser tab close)
 *    - Ctrl+Shift+F → Toggle Focus mode
 */
export function useGlobalShortcuts() {
  const {
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    toggleFocusMode,
    openSearch,
  } = useUI()

  const { activeTabId, closeTab, createDocument } = useWorkspace()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If default was already prevented by an inner element, do not re-handle
      if (e.defaultPrevented) return

      const isModifier = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      // -----------------------------------------------------------------------
      // 1. Editor-Native Shortcuts — DO NOT INTERCEPT
      // Pass directly to Tiptap / CodeMirror / native inputs for formatting/editing
      // -----------------------------------------------------------------------
      const isEditorFormattingShortcut =
        isModifier &&
        !e.altKey &&
        (
          // Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline)
          (key === 'b' && !e.shiftKey) ||
          (key === 'i' && !e.shiftKey) ||
          (key === 'u' && !e.shiftKey) ||
          // Ctrl+Z (Undo), Ctrl+Shift+Z / Ctrl+Y (Redo)
          key === 'z' ||
          key === 'y' ||
          // Standard text navigation/selection
          key === 'a' ||
          key === 'c' ||
          key === 'v' ||
          key === 'x'
        )

      if (isEditorFormattingShortcut) {
        // Explicitly allow editor handling without interference
        return
      }

      // -----------------------------------------------------------------------
      // 2. Application-Level Shortcuts
      // -----------------------------------------------------------------------

      // A. Command Palette: Ctrl + Shift + P
      if (isModifier && e.shiftKey && key === 'p') {
        e.preventDefault()
        e.stopPropagation()
        if (commandPaletteOpen) {
          closeCommandPalette()
        } else {
          openCommandPalette()
        }
        return
      }

      // B. Focus Mode: Ctrl + Shift + F
      if (isModifier && e.shiftKey && key === 'f') {
        e.preventDefault()
        e.stopPropagation()
        toggleFocusMode()
        return
      }

      // C. Save / Flush: Ctrl + S (prevent browser default page save dialog)
      if (isModifier && !e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault()
        e.stopPropagation()
        window.dispatchEvent(new CustomEvent('scratchpad:save'))
        return
      }

      // D. New Document: Ctrl + N (prevent browser from opening a new browser window)
      if (isModifier && !e.shiftKey && !e.altKey && key === 'n') {
        e.preventDefault()
        e.stopPropagation()
        createDocument('Untitled', 'rich', null)
        return
      }

      // E. Close Scratchpad Tab: Ctrl + W or Alt + W (prevent closing actual browser tab)
      const isCtrlW = isModifier && !e.shiftKey && key === 'w'
      const isAltW = e.altKey && !isModifier && key === 'w'
      if (isCtrlW || isAltW) {
        if (activeTabId) {
          e.preventDefault()
          e.stopPropagation()
          closeTab(activeTabId)
        }
        return
      }

      // F. Workspace Search: Ctrl + Alt + F
      if (isModifier && e.altKey && !e.shiftKey && key === 'f') {
        e.preventDefault()
        e.stopPropagation()
        openSearch()
        return
      }

      // G. Context-Aware In-Document Find / Replace: Ctrl + F (Find) / Ctrl + H (Replace)
      if (isModifier && !e.altKey && !e.shiftKey && (key === 'f' || key === 'h')) {
        const target = e.target as HTMLElement | null
        const isTextInput =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.closest('.workspace-search-modal') ||
            target.closest('.settings-modal') ||
            target.closest('.command-palette'))

        const isInsideEditor =
          target &&
          (Boolean(target.closest('.rich-editor')) ||
            Boolean(target.closest('.cm-editor')) ||
            Boolean(target.closest('.editor-pane')))

        // If focus is in a modal or text input outside the editor,
        // do NOT intercept Ctrl+F / Ctrl+H! Allow normal text navigation or browser behavior.
        if (isTextInput && !isInsideEditor) {
          return
        }

        // Active editor or general workspace focus → Trigger Scratchpad in-doc Find / Replace
        e.preventDefault()
        e.stopPropagation()
        if (key === 'f') {
          window.dispatchEvent(new CustomEvent('scratchpad:open-find'))
        } else {
          window.dispatchEvent(new CustomEvent('scratchpad:open-replace'))
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    toggleFocusMode,
    openSearch,
    activeTabId,
    closeTab,
    createDocument,
  ])
}
