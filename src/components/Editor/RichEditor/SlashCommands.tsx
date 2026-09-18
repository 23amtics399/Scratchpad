import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Quote,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Type,
} from 'lucide-react'
import { calculateOverlayPosition } from '@/utils/overlayPositioner.js'
import { overlayManager } from '@/utils/overlayManager.js'
import './SlashCommands.css'

interface SlashCommandItem {
  id: string
  title: string
  description: string
  icon: typeof Type
  action: (editor: Editor) => void
}

interface SlashCommandsProps {
  editor: Editor
  isOpen: boolean
  query: string
  position: { top: number; left: number }
  onClose: () => void
}

export function SlashCommands({ editor, isOpen, query, position, onClose }: SlashCommandsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const items: SlashCommandItem[] = useMemo(
    () => [
      {
        id: 'text',
        title: 'Text',
        description: 'Just start typing with plain paragraph text',
        icon: Type,
        action: (ed) => ed.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        title: 'Heading 1',
        description: 'Large section heading',
        icon: Heading1,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: Heading2,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'h3',
        title: 'Heading 3',
        description: 'Small section heading',
        icon: Heading3,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: 'h4',
        title: 'Heading 4',
        description: 'Sub-section heading',
        icon: Heading3,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
      },
      {
        id: 'h5',
        title: 'Heading 5',
        description: 'Minor heading',
        icon: Heading3,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 5 }).run(),
      },
      {
        id: 'h6',
        title: 'Heading 6',
        description: 'Smallest heading level',
        icon: Heading3,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 6 }).run(),
      },
      {
        id: 'bullet-list',
        title: 'Bullet List',
        description: 'Create a simple bulleted list',
        icon: List,
        action: (ed) => ed.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'numbered-list',
        title: 'Numbered List',
        description: 'Create a list with numbering',
        icon: ListOrdered,
        action: (ed) => ed.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'task-list',
        title: 'Task List',
        description: 'Track tasks with interactive checkboxes',
        icon: CheckSquare,
        action: (ed) => ed.chain().focus().toggleTaskList().run(),
      },
      {
        id: 'code-block',
        title: 'Code Block',
        description: 'Code container with syntax highlighting and line numbers',
        icon: Code2,
        action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'blockquote',
        title: 'Blockquote',
        description: 'Capture a quote or callout block',
        icon: Quote,
        action: (ed) => ed.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'divider',
        title: 'Divider',
        description: 'Visually divide blocks with a horizontal rule',
        icon: Minus,
        action: (ed) => ed.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'table',
        title: 'Table',
        description: 'Insert a 3x3 table with rows and columns',
        icon: TableIcon,
        action: (ed) =>
          ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        id: 'image',
        title: 'Image',
        description: 'Insert an image from your device',
        icon: ImageIcon,
        action: (ed) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = async () => {
            const file = input.files?.[0]
            if (file) {
              window.dispatchEvent(new CustomEvent('scratchpad:insert-image', { detail: { file } }))
            }
          }
          input.click()
          ed.chain().focus().run()
        },
      },
    ],
    []
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    )
  }, [items, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeItem = useCallback(
    (item: SlashCommandItem) => {
      // Delete the slash character before running command
      const { state } = editor
      const { from } = state.selection
      const slashLength = query.length + 1 // +1 for the '/' character
      editor.chain().focus().deleteRange({ from: Math.max(0, from - slashLength), to: from }).run()

      item.action(editor)
      onClose()
    },
    [editor, query, onClose]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          executeItem(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, filtered, selectedIndex, executeItem, onClose])

  // Overlay coordination: close if another overlay opens, and notify overlayManager
  useEffect(() => {
    if (isOpen) {
      overlayManager.open('slash-commands')
    } else {
      overlayManager.close('slash-commands')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleCloseOverlays = (e: Event) => {
      const customEvent = e as CustomEvent<{ exceptId?: string }>
      if (customEvent.detail?.exceptId !== 'slash-commands') {
        onClose()
      }
    }
    window.addEventListener('scratchpad:close-overlays', handleCloseOverlays)
    return () => {
      window.removeEventListener('scratchpad:close-overlays', handleCloseOverlays)
    }
  }, [isOpen, onClose])

  if (!isOpen || filtered.length === 0) return null

  const menuWidth = 280
  const menuHeight = Math.min(320, filtered.length * 44 + 40)
  const pos = calculateOverlayPosition({
    anchorRect: {
      top: position.top,
      left: position.left,
      width: 2,
      height: 24,
      bottom: position.top + 24,
      right: position.left + 2,
    },
    overlayRect: { width: menuWidth, height: menuHeight },
    viewportRect: {
      top: 0,
      left: 0,
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      height: typeof window !== 'undefined' ? window.innerHeight : 800,
      bottom: typeof window !== 'undefined' ? window.innerHeight : 800,
      right: typeof window !== 'undefined' ? window.innerWidth : 1280,
    },
    preferredPlacements: ['below', 'above', 'right', 'left'],
    gap: 4,
  })

  return (
    <div
      ref={menuRef}
      className="slash-commands-menu"
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        maxHeight: pos.maxHeight ? `${pos.maxHeight}px` : undefined,
      }}
      role="listbox"
      aria-label="Slash commands"
    >
      <div className="slash-commands-header">Basic Blocks</div>
      <div className="slash-commands-list">
        {filtered.map((item, index) => {
          const Icon = item.icon
          const isSelected = index === selectedIndex
          return (
            <button
              key={item.id}
              type="button"
              className={`slash-command-item ${isSelected ? 'is-selected' : ''}`}
              onClick={() => executeItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              role="option"
              aria-selected={isSelected}
            >
              <div className="slash-command-icon">
                <Icon size={16} />
              </div>
              <div className="slash-command-info">
                <span className="slash-command-title">{item.title}</span>
                <span className="slash-command-desc">{item.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
