import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import {
  Table as TableIcon,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Combine,
  Split,
  Heading,
  Check,
  ChevronDown,
  X,
  Palette,
  Square,
  Maximize2,
  Grid,
  Minus,
} from 'lucide-react'
import {
  applyTableBorder,
  getThemeBorderColor,
  updateActiveCellBorders,
  type BorderPreset,
  type BorderDef,
} from './extensions/TableExtensions.js'
import { calculateOverlayPosition, toRectLike, type RectLike } from '@/utils/overlayPositioner.js'
import { overlayManager } from '@/utils/overlayManager.js'
import './TableToolbar.css'

export interface TableToolbarProps {
  editor: Editor | null
  containerRef?: React.RefObject<HTMLDivElement | null>
  documentId?: string
}

const PALETTE_COLORS = [
  { name: 'Theme Border', value: 'THEME' },
  { name: 'Accent Blue', value: '#007acc' },
  { name: 'Danger Red', value: '#f85149' },
  { name: 'Success Green', value: '#2ea043' },
  { name: 'Warning Amber', value: '#e3b341' },
  { name: 'Purple', value: '#8a63d2' },
  { name: 'Neutral Gray', value: '#8b949e' },
  { name: 'Dark Slate', value: '#1f2428' },
  { name: 'Light Slate', value: '#f0f6fc' },
]

export function TableToolbar({ editor, containerRef, documentId = 'default' }: TableToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const compactBtnRef = useRef<HTMLButtonElement>(null)
  const colorBtnRef = useRef<HTMLButtonElement>(null)
  const mobileColorBtnRef = useRef<HTMLButtonElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Explicit expansion state: defaults to false so it never auto-expands
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  // Stable table dismissal tracking
  const [dismissedTableKey, setDismissedTableKey] = useState<string | null>(null)
  const dismissedTableElRef = useRef<HTMLTableElement | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerCoords, setColorPickerCoords] = useState<{ top: number; left: number } | null>(null)
  const [isTableActive, setIsTableActive] = useState<boolean>(() => !!editor?.isActive('table'))

  // Border customization states
  const [borderWidth, setBorderWidth] = useState<number>(1)
  const [borderStyle, setBorderStyle] = useState<BorderDef['style']>('solid')
  const [selectedColor, setSelectedColor] = useState<string>('THEME')
  const [customColor, setCustomColor] = useState<string>('#007acc')

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  })

  // Calculated coordinates
  const [compactCoords, setCompactCoords] = useState<{ top: number; left: number } | null>(null)
  const [expandedCoords, setExpandedCoords] = useState<{
    top: number
    left: number
    maxHeight?: number
    maxWidth?: number
    placement: string
  } | null>(null)

  // Current table identity calculation
  const getActiveTableInfo = useCallback(() => {
    if (!editor || !editor.isActive('table')) {
      return { tableEl: null, tableKey: null, tableStart: -1 }
    }

    const container = containerRef?.current || document.body
    const activeTable =
      container.querySelector<HTMLTableElement>('table.has-active-table') ||
      container.querySelector<HTMLTableCellElement>('.has-active-cell')?.closest('table') ||
      container.querySelector<HTMLTableElement>('.ProseMirror table')

    let tableStart = -1
    try {
      const { $from } = editor.state.selection
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === 'table') {
          tableStart = $from.start(d)
          break
        }
      }
    } catch {
      // ignore
    }

    const tableKey = tableStart >= 0 ? `${documentId}:${tableStart}` : null
    return { tableEl: activeTable, tableKey, tableStart }
  }, [editor, containerRef, documentId])

  // Check if current table is dismissed
  const { tableEl: currentTableEl, tableKey: currentTableKey } = getActiveTableInfo()
  const isDismissed =
    Boolean(currentTableKey && dismissedTableKey === currentTableKey) ||
    Boolean(currentTableEl && dismissedTableElRef.current === currentTableEl)

  // Calculate coordinates using reusable collision-aware overlay positioner
  const updatePosition = useCallback(() => {
    if (!editor || !editor.isActive('table')) {
      setCompactCoords(null)
      setExpandedCoords(null)
      return
    }

    const container = containerRef?.current
    if (!container || typeof window === 'undefined') {
      setCompactCoords({ top: 8, left: 16 })
      setExpandedCoords({ top: 40, left: 16, placement: 'below' })
      return
    }

    const { tableEl } = getActiveTableInfo()
    if (!tableEl) {
      setCompactCoords({ top: 8, left: 16 })
      setExpandedCoords({ top: 40, left: 16, placement: 'below' })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const tableRect = tableEl.getBoundingClientRect()

    // Retrieve active selection/caret rect if available to prevent covering it
    let avoidRect: RectLike | null = null
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0).getBoundingClientRect()
        if (r.width > 0 || r.height > 0) {
          avoidRect = toRectLike(r)
        }
      }
    } catch {
      // ignore
    }

    // Measure top toolbar offset to set safeInsets
    const topToolbar = container.querySelector<HTMLElement>('.rich-editor-toolbar')
    const topToolbarHeight = topToolbar ? topToolbar.offsetHeight : 42

    const safeInsets = {
      top: topToolbarHeight + 6,
      bottom: 8,
      left: 12,
      right: 12,
    }

    // 1. Calculate placement for compact pill (~140px x 32px)
    const compactSize = {
      width: compactBtnRef.current?.offsetWidth || 140,
      height: compactBtnRef.current?.offsetHeight || 32,
    }

    const compactPos = calculateOverlayPosition({
      anchorRect: toRectLike(tableRect),
      overlayRect: compactSize,
      viewportRect: toRectLike(containerRect),
      preferredPlacements: ['above', 'below', 'right', 'left'],
      gap: 6,
      safeInsets,
      avoidRect,
    })

    // Convert from viewport client coordinates to container-relative absolute coordinates
    setCompactCoords({
      top: Math.max(safeInsets.top, compactPos.top - containerRect.top),
      left: Math.max(safeInsets.left, compactPos.left - containerRect.left),
    })

    // 2. Calculate placement for expanded panel (~660px x 90px to 220px)
    const expandedWidth = Math.min(
      toolbarRef.current?.offsetWidth || 680,
      containerRect.width - safeInsets.left - safeInsets.right
    )
    const expandedHeight = toolbarRef.current?.offsetHeight || 96

    const expandedPos = calculateOverlayPosition({
      anchorRect: toRectLike(tableRect),
      overlayRect: { width: expandedWidth, height: expandedHeight },
      viewportRect: toRectLike(containerRect),
      preferredPlacements: ['above', 'below', 'right', 'left'],
      gap: 8,
      safeInsets,
      avoidRect,
    })

    setExpandedCoords({
      top: Math.max(safeInsets.top, expandedPos.top - containerRect.top),
      left: Math.max(safeInsets.left, expandedPos.left - containerRect.left),
      maxHeight: expandedPos.maxHeight,
      maxWidth: expandedPos.maxWidth,
      placement: expandedPos.placement,
    })
  }, [editor, containerRef, getActiveTableInfo])

  // Explicit dismissal handler: hides completely for current table
  const handleCloseForCurrentTable = useCallback(() => {
    const { tableEl, tableKey } = getActiveTableInfo()
    if (tableKey) {
      setDismissedTableKey(tableKey)
    }
    if (tableEl) {
      dismissedTableElRef.current = tableEl
    }
    setIsExpanded(false)
    setMobileOpen(false)
    setShowColorPicker(false)
    setShowDeleteConfirm(false)
    overlayManager.close('table-toolbar')
  }, [getActiveTableInfo])

  // Explicit reopen handler
  const handleReopen = useCallback(() => {
    setDismissedTableKey(null)
    dismissedTableElRef.current = null
    setIsExpanded(true)
    overlayManager.open('table-toolbar')
    updatePosition()
  }, [updatePosition])

  // Update color picker coordinates anchored to active color button
  const updateColorPickerPosition = useCallback(() => {
    if (typeof window === 'undefined') return
    const isMob = window.innerWidth <= 640
    const btn = isMob ? mobileColorBtnRef.current : colorBtnRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const popoverWidth = 172
    const popoverHeight = 160
    const margin = 6

    let top: number
    if (rect.bottom + margin + popoverHeight <= window.innerHeight - 8) {
      top = rect.bottom + margin
    } else if (rect.top - margin - popoverHeight >= 8) {
      top = rect.top - margin - popoverHeight
    } else {
      top = Math.max(8, window.innerHeight - popoverHeight - 8)
    }

    let left = rect.left
    if (left + popoverWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popoverWidth - 8)
    }
    if (left < 8) {
      left = 8
    }

    setColorPickerCoords({ top, left })
  }, [])

  const toggleColorPicker = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowColorPicker((prev) => {
      const next = !prev
      if (next && typeof window !== 'undefined') {
        const isMob = window.innerWidth <= 640
        const btn = isMob ? mobileColorBtnRef.current : colorBtnRef.current
        if (btn) {
          const rect = btn.getBoundingClientRect()
          const popoverWidth = 172
          const popoverHeight = 160
          const margin = 6
          const top =
            rect.bottom + margin + popoverHeight <= window.innerHeight - 8
              ? rect.bottom + margin
              : rect.top - margin - popoverHeight >= 8
              ? rect.top - margin - popoverHeight
              : Math.max(8, window.innerHeight - popoverHeight - 8)
          let left = rect.left
          if (left + popoverWidth > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - popoverWidth - 8)
          }
          if (left < 8) left = 8
          setColorPickerCoords({ top, left })
        } else {
          setColorPickerCoords({ top: 100, left: 100 })
        }
      }
      return next
    })
  }, [])

  // Keep color picker positioned on scroll / resize
  useEffect(() => {
    if (!showColorPicker) return
    updateColorPickerPosition()

    const handleSync = () => {
      updateColorPickerPosition()
    }

    window.addEventListener('resize', handleSync)
    window.addEventListener('scroll', handleSync, true)
    return () => {
      window.removeEventListener('resize', handleSync)
      window.removeEventListener('scroll', handleSync, true)
    }
  }, [showColorPicker, updateColorPickerPosition])

  // Close color picker on outside click (excluding triggering buttons)
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(target) &&
        !colorBtnRef.current?.contains(target) &&
        !mobileColorBtnRef.current?.contains(target)
      ) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) {
      document.addEventListener('pointerdown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
    }
  }, [showColorPicker])

  // Listen to window resizing for mobile breakpoint & overlay close
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640
      setIsMobile(mobile)
      if (!mobile) {
        setMobileOpen(false)
      }
      setShowColorPicker(false)
      updatePosition()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scratchpad:viewport-resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scratchpad:viewport-resize', handleResize)
    }
  }, [updatePosition])

  // Global overlay coordination: collapse when another overlay opens
  useEffect(() => {
    const handleCloseOverlays = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptId?: string }>
      if (customEvent.detail?.exceptId !== 'table-toolbar') {
        setIsExpanded(false)
        setShowColorPicker(false)
      }
    }
    const handleExplicitReopen = () => handleReopen()

    window.addEventListener('scratchpad:close-overlays', handleCloseOverlays)
    window.addEventListener('scratchpad:open-table-actions', handleExplicitReopen)
    return () => {
      window.removeEventListener('scratchpad:close-overlays', handleCloseOverlays)
      window.removeEventListener('scratchpad:open-table-actions', handleExplicitReopen)
    }
  }, [handleReopen])

  // Listen for Escape key and outside clicks per exact specification
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) {
          e.preventDefault()
          e.stopPropagation()
          setShowColorPicker(false)
          return
        }
        if (isExpanded) {
          e.preventDefault()
          e.stopPropagation()
          setIsExpanded(false) // Escape while expanded -> compact
        } else if (isTableActive && !isDismissed) {
          e.preventDefault()
          e.stopPropagation()
          handleCloseForCurrentTable() // Escape while compact -> hide completely
        }
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        isExpanded &&
        toolbarRef.current &&
        !toolbarRef.current.contains(target) &&
        !colorPickerRef.current?.contains(target)
      ) {
        // Click outside expanded toolbar -> collapse to compact
        setIsExpanded(false)
        setShowColorPicker(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [showColorPicker, isExpanded, isTableActive, isDismissed, handleCloseForCurrentTable])

  // Update position on editor transactions / selection changes and scrolling
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const active = !!editor.isActive('table')
      setIsTableActive(active)

      // Invalidate dismissal when selection moves to another table
      const { tableEl, tableKey } = getActiveTableInfo()
      if (tableEl && dismissedTableElRef.current && dismissedTableElRef.current !== tableEl) {
        setDismissedTableKey(null)
        dismissedTableElRef.current = null
      } else if (tableKey && dismissedTableKey && dismissedTableKey !== tableKey) {
        setDismissedTableKey(null)
        dismissedTableElRef.current = null
      }

      updatePosition()
      setShowDeleteConfirm(false)
    }

    editor.on('selectionUpdate', handleUpdate)
    editor.on('transaction', handleUpdate)

    const container = containerRef?.current
    const scrollWrapper = container?.querySelector('.rich-editor-content-wrapper')
    if (scrollWrapper) {
      scrollWrapper.addEventListener('scroll', updatePosition, { passive: true })
    }
    if (container) {
      container.addEventListener('scroll', updatePosition, { passive: true })
    }

    setIsTableActive(!!editor.isActive('table'))
    updatePosition()

    return () => {
      editor.off('selectionUpdate', handleUpdate)
      editor.off('transaction', handleUpdate)
      if (scrollWrapper) {
        scrollWrapper.removeEventListener('scroll', updatePosition)
      }
      if (container) {
        container.removeEventListener('scroll', updatePosition)
      }
    }
  }, [editor, containerRef, getActiveTableInfo, updatePosition, dismissedTableKey])

  if (!editor || !isTableActive || isDismissed) {
    return null
  }

  // Capability checks for contextual table actions
  const canAddRowAbove = editor.can().addRowBefore()
  const canAddRowBelow = editor.can().addRowAfter()
  const canDeleteRow = editor.can().deleteRow()

  const canAddColLeft = editor.can().addColumnBefore()
  const canAddColRight = editor.can().addColumnAfter()
  const canDeleteCol = editor.can().deleteColumn()

  const canMerge = editor.can().mergeCells()
  const canSplit = editor.can().splitCell()

  const isHeaderActive = editor.isActive('tableHeader')
  const canToggleHeader = editor.can().toggleHeaderRow()
  const canDeleteTable = editor.can().deleteTable()

  // Resolve active concrete border color
  const getResolvedColor = () => {
    if (selectedColor === 'THEME') {
      return getThemeBorderColor()
    }
    return selectedColor
  }

  // Helper to execute commands while preserving editor focus
  const runCmd = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    action()
    requestAnimationFrame(() => {
      if (!editor.isFocused) {
        editor.commands.focus()
      }
    })
  }

  // Helper to apply border preset
  const handleBorderPreset = (preset: BorderPreset) => (e: React.MouseEvent) => {
    e.preventDefault()
    applyTableBorder(editor, preset, {
      width: borderWidth,
      style: borderStyle,
      color: getResolvedColor(),
    })
  }

  // Delete table confirmation handler
  const handleDeleteTable = (e: React.MouseEvent) => {
    e.preventDefault()
    editor.chain().focus().deleteTable().run()
    setShowDeleteConfirm(false)
    setIsExpanded(false)
    setMobileOpen(false)
    overlayManager.close('table-toolbar')
  }

  // Real-time border attribute handlers
  const handleSelectColor = (colorValue: string) => {
    setSelectedColor(colorValue)
    setShowColorPicker(false)
    if (editor && editor.isActive('table')) {
      updateActiveCellBorders(editor, {
        color: colorValue === 'THEME' ? getThemeBorderColor() : colorValue,
      })
    }
  }

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor)
    setSelectedColor(newColor)
    if (editor && editor.isActive('table')) {
      updateActiveCellBorders(editor, {
        color: newColor,
      })
    }
  }

  const handleWidthChange = (newWidth: number) => {
    setBorderWidth(newWidth)
    if (editor && editor.isActive('table')) {
      updateActiveCellBorders(editor, {
        width: newWidth,
      })
    }
  }

  const handleStyleChange = (newStyle: BorderDef['style']) => {
    setBorderStyle(newStyle)
    if (editor && editor.isActive('table')) {
      updateActiveCellBorders(editor, {
        style: newStyle,
      })
    }
  }

  // Floating Color Picker Portal anchored to triggering button
  const renderColorPickerPortal = () => {
    if (!showColorPicker || !colorPickerCoords) return null

    return createPortal(
      <div
        ref={colorPickerRef}
        id="table-border-palette-popover"
        className="table-toolbar__palette-popover"
        style={{
          position: 'fixed',
          top: `${colorPickerCoords.top}px`,
          left: `${colorPickerCoords.left}px`,
          zIndex: 1250,
        }}
        role="dialog"
        aria-label="Border Color Palette"
      >
        <div className="table-toolbar__palette-title">Border Color</div>
        <div className="table-toolbar__swatches-grid">
          {PALETTE_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              className={`table-toolbar__swatch-btn ${selectedColor === c.value ? 'is-selected' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                handleSelectColor(c.value)
              }}
              onMouseDown={(e) => e.preventDefault()}
              title={c.name}
              aria-label={c.name}
              style={{
                backgroundColor: c.value === 'THEME' ? 'var(--sp-color-border)' : c.value,
              }}
            />
          ))}
        </div>
        <div className="table-toolbar__custom-color-row">
          <label htmlFor="table-custom-color-input" className="table-toolbar__custom-color-label">
            Custom:
          </label>
          <input
            id="table-custom-color-input"
            type="color"
            value={customColor}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            className="table-toolbar__color-input"
            aria-label="Custom Border Color"
          />
        </div>
      </div>,
      document.body
    )
  }

  // ---------------------------------------------------------------------------
  // Mobile Layout (<=640px)
  // ---------------------------------------------------------------------------
  if (isMobile) {
    return (
      <>
        <div
          id="table-toolbar-mobile-root"
        className="table-toolbar-mobile-container"
        style={
          compactCoords
            ? {
                top: `${compactCoords.top}px`,
                left: `${compactCoords.left}px`,
              }
            : undefined
        }
      >
        <button
          ref={compactBtnRef}
          id="table-mobile-toggle-btn"
          type="button"
          className={`table-mobile-toggle-btn ${mobileOpen ? 'is-active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            const nextState = !mobileOpen
            setMobileOpen(nextState)
            if (nextState) {
              overlayManager.open('table-toolbar')
            } else {
              overlayManager.close('table-toolbar')
            }
          }}
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          aria-label="Table Actions Menu"
          title="Table Actions Menu"
          onMouseDown={(e) => e.preventDefault()}
        >
          <TableIcon size={15} />
          <span>Table Actions</span>
          <ChevronDown size={14} className={`table-mobile-toggle-arrow ${mobileOpen ? 'is-rotated' : ''}`} />
        </button>

        {mobileOpen && (
          <div
            id="table-mobile-sheet"
            className="table-mobile-sheet"
            role="dialog"
            aria-label="Table editing actions"
          >
            <div className="table-mobile-sheet__header">
              <div className="table-mobile-sheet__title">
                <TableIcon size={16} />
                <span>Table Actions</span>
              </div>
              <div className="table-mobile-sheet__actions">
                <button
                  id="table-mobile-minimize-btn"
                  type="button"
                  className="table-mobile-sheet__close"
                  onClick={(e) => {
                    e.preventDefault()
                    setMobileOpen(false)
                  }}
                  aria-label="Minimize table actions"
                  title="Minimize table actions"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Minus size={16} />
                </button>
                <button
                  id="table-mobile-close-btn"
                  type="button"
                  className="table-mobile-sheet__close"
                  onClick={(e) => {
                    e.preventDefault()
                    handleCloseForCurrentTable()
                  }}
                  aria-label="Close table actions"
                  title="Close table actions"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="table-mobile-sheet__body">
              {/* Rows Section */}
              <div className="table-mobile-section">
                <div className="table-mobile-section__label">Rows</div>
                <div className="table-mobile-section__grid">
                  <button
                    id="table-btn-add-row-above"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canAddRowAbove}
                    onClick={runCmd(() => editor.chain().focus().addRowBefore().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Add row above"
                    aria-label="Add row above"
                  >
                    <ArrowUpToLine size={14} />
                    <span>Above</span>
                  </button>
                  <button
                    id="table-btn-add-row-below"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canAddRowBelow}
                    onClick={runCmd(() => editor.chain().focus().addRowAfter().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Add row below"
                    aria-label="Add row below"
                  >
                    <ArrowDownToLine size={14} />
                    <span>Below</span>
                  </button>
                  <button
                    id="table-btn-delete-row"
                    type="button"
                    className="table-mobile-action-btn table-action-btn--danger"
                    disabled={!canDeleteRow}
                    onClick={runCmd(() => editor.chain().focus().deleteRow().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Delete row"
                    aria-label="Delete row"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Columns Section */}
              <div className="table-mobile-section">
                <div className="table-mobile-section__label">Columns</div>
                <div className="table-mobile-section__grid">
                  <button
                    id="table-btn-add-col-left"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canAddColLeft}
                    onClick={runCmd(() => editor.chain().focus().addColumnBefore().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Add column left"
                    aria-label="Add column left"
                  >
                    <ArrowLeftToLine size={14} />
                    <span>Left</span>
                  </button>
                  <button
                    id="table-btn-add-col-right"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canAddColRight}
                    onClick={runCmd(() => editor.chain().focus().addColumnAfter().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Add column right"
                    aria-label="Add column right"
                  >
                    <ArrowRightToLine size={14} />
                    <span>Right</span>
                  </button>
                  <button
                    id="table-btn-delete-col"
                    type="button"
                    className="table-mobile-action-btn table-action-btn--danger"
                    disabled={!canDeleteCol}
                    onClick={runCmd(() => editor.chain().focus().deleteColumn().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Delete column"
                    aria-label="Delete column"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Cells Section */}
              <div className="table-mobile-section">
                <div className="table-mobile-section__label">Cells</div>
                <div className="table-mobile-section__grid">
                  <button
                    id="table-btn-merge-cells"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canMerge}
                    onClick={runCmd(() => editor.chain().focus().mergeCells().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Merge selected cells"
                    aria-label="Merge cells"
                  >
                    <Combine size={14} />
                    <span>Merge</span>
                  </button>
                  <button
                    id="table-btn-split-cell"
                    type="button"
                    className="table-mobile-action-btn"
                    disabled={!canSplit}
                    onClick={runCmd(() => editor.chain().focus().splitCell().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Split merged cell"
                    aria-label="Split cell"
                  >
                    <Split size={14} />
                    <span>Split</span>
                  </button>
                </div>
              </div>

              {/* Borders Section */}
              <div className="table-mobile-section">
                <div className="table-mobile-section__label">Borders</div>
                <div className="table-mobile-section__grid">
                  <button
                    id="table-btn-border-all"
                    type="button"
                    className="table-mobile-action-btn"
                    onClick={handleBorderPreset('all')}
                    onMouseDown={(e) => e.preventDefault()}
                    title="All borders"
                    aria-label="All borders"
                  >
                    <Grid size={14} />
                    <span>All</span>
                  </button>
                  <button
                    id="table-btn-border-outer"
                    type="button"
                    className="table-mobile-action-btn"
                    onClick={handleBorderPreset('outer')}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Outer borders"
                    aria-label="Outer borders"
                  >
                    <Square size={14} />
                    <span>Outer</span>
                  </button>
                  <button
                    id="table-btn-border-inner"
                    type="button"
                    className="table-mobile-action-btn"
                    onClick={handleBorderPreset('inner')}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Inner borders"
                    aria-label="Inner borders"
                  >
                    <Maximize2 size={14} />
                    <span>Inner</span>
                  </button>
                  <button
                    id="table-btn-border-none"
                    type="button"
                    className="table-mobile-action-btn"
                    onClick={handleBorderPreset('none')}
                    onMouseDown={(e) => e.preventDefault()}
                    title="No borders"
                    aria-label="No borders"
                  >
                    <Minus size={14} />
                    <span>None</span>
                  </button>
                </div>

                {/* Border Modifiers */}
                <div className="table-mobile-border-modifiers">
                  <button
                    ref={mobileColorBtnRef}
                    id="table-border-color-btn-mobile"
                    type="button"
                    className={`table-mobile-action-btn table-mobile-action-btn--color ${showColorPicker ? 'is-active' : ''}`}
                    onClick={toggleColorPicker}
                    onMouseDown={(e) => e.preventDefault()}
                    title={`Border Color (${selectedColor})`}
                    aria-label="Border Color"
                    aria-expanded={showColorPicker}
                  >
                    <Palette size={14} />
                    <span>Color</span>
                    <span
                      className="table-toolbar__color-swatch-indicator"
                      style={{
                        backgroundColor:
                          selectedColor === 'THEME' ? 'var(--sp-color-border)' : selectedColor,
                      }}
                    />
                  </button>

                  <select
                    id="table-border-width-select-mobile"
                    className="table-mobile-select"
                    value={borderWidth}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    title="Border Width"
                    aria-label="Border Width"
                  >
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                  </select>

                  <select
                    id="table-border-style-select-mobile"
                    className="table-mobile-select"
                    value={borderStyle}
                    onChange={(e) => handleStyleChange(e.target.value as BorderDef['style'])}
                    title="Border Style"
                    aria-label="Border Style"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                  </select>
                </div>
              </div>

              {/* Table Section */}
              <div className="table-mobile-section">
                <div className="table-mobile-section__label">Table</div>
                <div className="table-mobile-section__grid">
                  <button
                    id="table-btn-toggle-header"
                    type="button"
                    className={`table-mobile-action-btn ${isHeaderActive ? 'table-action-btn--active' : ''}`}
                    disabled={!canToggleHeader}
                    onClick={runCmd(() => editor.chain().focus().toggleHeaderRow().run())}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Toggle header row"
                    aria-label="Toggle header row"
                  >
                    {isHeaderActive ? <Check size={14} /> : <Heading size={14} />}
                    <span>{isHeaderActive ? '✓ Header Row' : 'Header Row'}</span>
                  </button>

                  {!showDeleteConfirm ? (
                    <button
                      id="table-btn-delete-table"
                      type="button"
                      className="table-mobile-action-btn table-action-btn--danger"
                      disabled={!canDeleteTable}
                      onClick={(e) => {
                        e.preventDefault()
                        setShowDeleteConfirm(true)
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Delete table"
                      aria-label="Delete table"
                    >
                      <Trash2 size={14} />
                      <span>Delete Table</span>
                    </button>
                  ) : (
                    <div className="table-mobile-confirm-box" role="alertdialog" aria-label="Confirm table deletion">
                      <span className="table-mobile-confirm-text">Delete this table?</span>
                      <div className="table-mobile-confirm-actions">
                        <button
                          id="table-btn-confirm-delete"
                          type="button"
                          className="table-confirm-btn table-confirm-btn--danger"
                          onClick={handleDeleteTable}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          Delete
                        </button>
                        <button
                          id="table-btn-cancel-delete"
                          type="button"
                          className="table-confirm-btn table-confirm-btn--cancel"
                          onClick={(e) => {
                            e.preventDefault()
                            setShowDeleteConfirm(false)
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderColorPickerPortal()}
    </>
    )
  }

  // ---------------------------------------------------------------------------
  // Desktop & Tablet Layout (>640px)
  // ---------------------------------------------------------------------------

  // Default compact state: render only "Table Actions ▾"
  if (!isExpanded) {
    return (
      <div
        id="table-toolbar-compact-root"
        className="table-toolbar-compact-container"
        style={
          compactCoords
            ? {
                top: `${compactCoords.top}px`,
                left: `${compactCoords.left}px`,
              }
            : undefined
        }
      >
        <button
          ref={compactBtnRef}
          id="table-toolbar-compact-btn"
          type="button"
          className="table-toolbar-compact-btn"
          onClick={(e) => {
            e.preventDefault()
            setIsExpanded(true)
            overlayManager.open('table-toolbar')
          }}
          onMouseDown={(e) => e.preventDefault()}
          title="Table Actions ▾"
          aria-label="Table Actions"
          aria-expanded={false}
        >
          <TableIcon size={14} className="table-toolbar-compact-icon" />
          <span>Table Actions</span>
          <ChevronDown size={13} className="table-toolbar-compact-arrow" />
        </button>
      </div>
    )
  }

  // Expanded state: full grouped controls with Header (Minimize [−] and Close [×])
  return (
    <>
      <div
        ref={toolbarRef}
      id="table-toolbar-root"
      className="table-toolbar table-toolbar--expanded"
      role="dialog"
      aria-label="Table editing controls"
      style={
        expandedCoords
          ? {
              top: `${expandedCoords.top}px`,
              left: `${expandedCoords.left}px`,
              maxHeight: expandedCoords.maxHeight ? `${expandedCoords.maxHeight}px` : undefined,
              maxWidth: expandedCoords.maxWidth ? `${expandedCoords.maxWidth}px` : undefined,
            }
          : undefined
      }
    >
      {/* Sticky Header with Title, Minimize [−], and Close [×] */}
      <div className="table-toolbar__header">
        <div className="table-toolbar__header-title">
          <TableIcon size={14} />
          <span>Table Actions</span>
        </div>
        <div className="table-toolbar__header-actions">
          <button
            id="table-toolbar-minimize-btn"
            type="button"
            className="table-toolbar__header-btn"
            onClick={(e) => {
              e.preventDefault()
              setIsExpanded(false)
              overlayManager.close('table-toolbar')
            }}
            onMouseDown={(e) => e.preventDefault()}
            title="Minimize to compact bar (−)"
            aria-label="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            id="table-toolbar-close-btn"
            type="button"
            className="table-toolbar__header-btn table-toolbar__header-btn--close"
            onClick={(e) => {
              e.preventDefault()
              handleCloseForCurrentTable()
            }}
            onMouseDown={(e) => e.preventDefault()}
            title="Close table actions (×)"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="table-toolbar__body">
        {/* Rows Group */}
        <div className="table-toolbar__group" role="group" aria-label="Row operations">
          <span className="table-toolbar__group-label">Rows</span>
          <button
            id="table-btn-add-row-above"
            type="button"
            className="table-toolbar__btn"
            disabled={!canAddRowAbove}
            onClick={runCmd(() => editor.chain().focus().addRowBefore().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Add row above"
            aria-label="Add row above"
          >
            <ArrowUpToLine size={14} />
            <span>Above</span>
          </button>
          <button
            id="table-btn-add-row-below"
            type="button"
            className="table-toolbar__btn"
            disabled={!canAddRowBelow}
            onClick={runCmd(() => editor.chain().focus().addRowAfter().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Add row below"
            aria-label="Add row below"
          >
            <ArrowDownToLine size={14} />
            <span>Below</span>
          </button>
          <button
            id="table-btn-delete-row"
            type="button"
            className="table-toolbar__btn table-action-btn--danger"
            disabled={!canDeleteRow}
            onClick={runCmd(() => editor.chain().focus().deleteRow().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Delete row"
            aria-label="Delete row"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>

        <div className="table-toolbar__sep" />

        {/* Columns Group */}
        <div className="table-toolbar__group" role="group" aria-label="Column operations">
          <span className="table-toolbar__group-label">Columns</span>
          <button
            id="table-btn-add-col-left"
            type="button"
            className="table-toolbar__btn"
            disabled={!canAddColLeft}
            onClick={runCmd(() => editor.chain().focus().addColumnBefore().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Add column left"
            aria-label="Add column left"
          >
            <ArrowLeftToLine size={14} />
            <span>Left</span>
          </button>
          <button
            id="table-btn-add-col-right"
            type="button"
            className="table-toolbar__btn"
            disabled={!canAddColRight}
            onClick={runCmd(() => editor.chain().focus().addColumnAfter().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Add column right"
            aria-label="Add column right"
          >
            <ArrowRightToLine size={14} />
            <span>Right</span>
          </button>
          <button
            id="table-btn-delete-col"
            type="button"
            className="table-toolbar__btn table-action-btn--danger"
            disabled={!canDeleteCol}
            onClick={runCmd(() => editor.chain().focus().deleteColumn().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Delete column"
            aria-label="Delete column"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>

        <div className="table-toolbar__sep" />

        {/* Cells Group */}
        <div className="table-toolbar__group" role="group" aria-label="Cell operations">
          <span className="table-toolbar__group-label">Cells</span>
          <button
            id="table-btn-merge-cells"
            type="button"
            className="table-toolbar__btn"
            disabled={!canMerge}
            onClick={runCmd(() => editor.chain().focus().mergeCells().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Merge selected cells"
            aria-label="Merge cells"
          >
            <Combine size={14} />
            <span>Merge</span>
          </button>
          <button
            id="table-btn-split-cell"
            type="button"
            className="table-toolbar__btn"
            disabled={!canSplit}
            onClick={runCmd(() => editor.chain().focus().splitCell().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Split merged cell"
            aria-label="Split cell"
          >
            <Split size={14} />
            <span>Split</span>
          </button>
        </div>

        <div className="table-toolbar__sep" />

        {/* Borders Group */}
        <div className="table-toolbar__group table-toolbar__group--borders" role="group" aria-label="Border operations">
          <span className="table-toolbar__group-label">Borders</span>

          {/* Presets */}
          <div className="table-toolbar__border-subgroup" role="group" aria-label="Border Presets">
            <button
              id="table-btn-border-all"
              type="button"
              className="table-toolbar__btn"
              onClick={handleBorderPreset('all')}
              onMouseDown={(e) => e.preventDefault()}
              title="All borders"
              aria-label="All borders"
            >
              <Grid size={13} />
              <span>All</span>
            </button>
            <button
              id="table-btn-border-outer"
              type="button"
              className="table-toolbar__btn"
              onClick={handleBorderPreset('outer')}
              onMouseDown={(e) => e.preventDefault()}
              title="Outer borders"
              aria-label="Outer borders"
            >
              <Square size={13} />
              <span>Outer</span>
            </button>
            <button
              id="table-btn-border-inner"
              type="button"
              className="table-toolbar__btn"
              onClick={handleBorderPreset('inner')}
              onMouseDown={(e) => e.preventDefault()}
              title="Inner borders"
              aria-label="Inner borders"
            >
              <Maximize2 size={13} />
              <span>Inner</span>
            </button>
            <button
              id="table-btn-border-none"
              type="button"
              className="table-toolbar__btn"
              onClick={handleBorderPreset('none')}
              onMouseDown={(e) => e.preventDefault()}
              title="No borders"
              aria-label="No borders"
            >
              <Minus size={13} />
              <span>None</span>
            </button>
          </div>

          {/* Sides */}
          <div className="table-toolbar__border-subgroup" role="group" aria-label="Border Sides">
            <button
              id="table-btn-border-top"
              type="button"
              className="table-toolbar__btn table-toolbar__btn--side"
              onClick={handleBorderPreset('top')}
              onMouseDown={(e) => e.preventDefault()}
              title="Top border"
              aria-label="Top border"
            >
              Top
            </button>
            <button
              id="table-btn-border-bottom"
              type="button"
              className="table-toolbar__btn table-toolbar__btn--side"
              onClick={handleBorderPreset('bottom')}
              onMouseDown={(e) => e.preventDefault()}
              title="Bottom border"
              aria-label="Bottom border"
            >
              Bottom
            </button>
            <button
              id="table-btn-border-left"
              type="button"
              className="table-toolbar__btn table-toolbar__btn--side"
              onClick={handleBorderPreset('left')}
              onMouseDown={(e) => e.preventDefault()}
              title="Left border"
              aria-label="Left border"
            >
              Left
            </button>
            <button
              id="table-btn-border-right"
              type="button"
              className="table-toolbar__btn table-toolbar__btn--side"
              onClick={handleBorderPreset('right')}
              onMouseDown={(e) => e.preventDefault()}
              title="Right border"
              aria-label="Right border"
            >
              Right
            </button>
          </div>

          {/* Modifiers: Color, Width, Style */}
          <div className="table-toolbar__border-subgroup table-toolbar__border-modifiers">
            <button
              ref={colorBtnRef}
              id="table-border-color-btn"
              type="button"
              className={`table-toolbar__btn table-toolbar__btn--color ${showColorPicker ? 'is-active' : ''}`}
              onClick={toggleColorPicker}
              onMouseDown={(e) => e.preventDefault()}
              title={`Border Color (${selectedColor})`}
              aria-label="Border Color"
              aria-expanded={showColorPicker}
            >
              <Palette size={13} />
              <span
                className="table-toolbar__color-swatch-indicator"
                style={{
                  backgroundColor: selectedColor === 'THEME' ? 'var(--sp-color-border)' : selectedColor,
                }}
              />
              <ChevronDown size={11} />
            </button>

            <select
              id="table-border-width-select"
              className="table-toolbar__select"
              value={borderWidth}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              title="Border Width"
              aria-label="Border Width"
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
            </select>

            <select
              id="table-border-style-select"
              className="table-toolbar__select"
              value={borderStyle}
              onChange={(e) => handleStyleChange(e.target.value as BorderDef['style'])}
              title="Border Style"
              aria-label="Border Style"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
            </select>
          </div>
        </div>

        <div className="table-toolbar__sep" />

        {/* Table Group */}
        <div className="table-toolbar__group" role="group" aria-label="Table operations">
          <span className="table-toolbar__group-label">Table</span>
          <button
            id="table-btn-toggle-header"
            type="button"
            className={`table-toolbar__btn ${isHeaderActive ? 'table-action-btn--active' : ''}`}
            disabled={!canToggleHeader}
            onClick={runCmd(() => editor.chain().focus().toggleHeaderRow().run())}
            onMouseDown={(e) => e.preventDefault()}
            title="Toggle header row"
            aria-label="Toggle header row"
          >
            {isHeaderActive ? <Check size={14} /> : <Heading size={14} />}
            <span>{isHeaderActive ? '✓ Header Row' : 'Header Row'}</span>
          </button>

          {!showDeleteConfirm ? (
            <button
              id="table-btn-delete-table"
              type="button"
              className="table-toolbar__btn table-action-btn--danger"
              disabled={!canDeleteTable}
              onClick={(e) => {
                e.preventDefault()
                setShowDeleteConfirm(true)
              }}
              onMouseDown={(e) => e.preventDefault()}
              title="Delete table"
              aria-label="Delete table"
            >
              <Trash2 size={14} />
              <span>Delete Table</span>
            </button>
          ) : (
            <div className="table-toolbar__confirm-box" role="alertdialog" aria-label="Confirm table deletion">
              <span className="table-toolbar__confirm-text">Delete this table?</span>
              <button
                id="table-btn-confirm-delete"
                type="button"
                className="table-confirm-btn table-confirm-btn--danger"
                onClick={handleDeleteTable}
                onMouseDown={(e) => e.preventDefault()}
                title="Confirm delete table"
              >
                Delete
              </button>
              <button
                id="table-btn-cancel-delete"
                type="button"
                className="table-confirm-btn table-confirm-btn--cancel"
                onClick={(e) => {
                  e.preventDefault()
                  setShowDeleteConfirm(false)
                }}
                onMouseDown={(e) => e.preventDefault()}
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    {renderColorPickerPortal()}
  </>
  )
}
