import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUI } from '@/contexts/UIContext.js'
import { overlayManager } from '@/utils/overlayManager.js'
import './ContextMenu.css'

export function ContextMenu() {
  const { contextMenu, closeContextMenu } = useUI()
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  useEffect(() => {
    if (contextMenu) {
      overlayManager.open('context-menu')
    } else {
      overlayManager.close('context-menu')
    }
  }, [contextMenu])

  // Compute position clamped within viewport
  useLayoutEffect(() => {
    if (!contextMenu || !menuRef.current) return

    const rect = menuRef.current.getBoundingClientRect()
    const padding = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = contextMenu.x
    let y = contextMenu.y

    if (x + rect.width > viewportWidth - padding) {
      x = Math.max(padding, viewportWidth - rect.width - padding)
    }
    if (y + rect.height > viewportHeight - padding) {
      y = Math.max(padding, viewportHeight - rect.height - padding)
    }

    setPosition({ x, y })
    setFocusedIndex(-1)
  }, [contextMenu])

  // Handle outside click, scroll, and escape
  useEffect(() => {
    if (!contextMenu) return

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeContextMenu()
        return
      }

      if (!contextMenu.items.length) return
      const interactiveItems = contextMenu.items.filter((item) => !item.separator && !item.disabled)
      if (interactiveItems.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % interactiveItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev <= 0 ? interactiveItems.length - 1 : prev - 1))
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        const selected = interactiveItems[focusedIndex]
        if (selected?.action) {
          selected.action()
          closeContextMenu()
        }
      }
    }

    const handleCloseOverlays = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptId?: string }>
      if (customEvent.detail?.exceptId !== 'context-menu') {
        closeContextMenu()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', closeContextMenu)
    window.addEventListener('scroll', closeContextMenu, true)
    window.addEventListener('scratchpad:close-overlays', handleCloseOverlays)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', closeContextMenu)
      window.removeEventListener('scroll', closeContextMenu, true)
      window.removeEventListener('scratchpad:close-overlays', handleCloseOverlays)
    }
  }, [contextMenu, closeContextMenu, focusedIndex])

  if (!contextMenu) return null

  let interactiveCounter = -1

  return createPortal(
    <div
      ref={menuRef}
      id="scratchpad-context-menu"
      className="context-menu"
      role="menu"
      aria-orientation="vertical"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {contextMenu.items.map((item, idx) => {
        if (item.separator) {
          return <div key={`sep-${idx}`} className="context-menu__separator" role="separator" />
        }

        const isInteractive = !item.disabled
        const currentItemIndex = isInteractive ? ++interactiveCounter : -1
        const isFocused = isInteractive && currentItemIndex === focusedIndex

        return (
          <button
            key={item.id || `item-${idx}`}
            id={`ctx-item-${item.id}`}
            type="button"
            className={`context-menu__item ${item.danger ? 'context-menu__item--danger' : ''} ${
              isFocused ? 'context-menu__item--focused' : ''
            }`}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.action) item.action()
              closeContextMenu()
            }}
          >
            <span className="context-menu__item-label">{item.label}</span>
            {item.shortcut && <kbd className="context-menu__item-shortcut">{item.shortcut}</kbd>}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
