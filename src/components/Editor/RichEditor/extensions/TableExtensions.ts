import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { TableMap, CellSelection } from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/react'

export interface BorderDef {
  width: number
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none'
  color: string
}

export function getThemeBorderColor(): string {
  if (typeof window === 'undefined') return '#30363d'
  const computed = getComputedStyle(document.documentElement).getPropertyValue('--sp-color-border').trim()
  if (computed && !computed.startsWith('var')) return computed
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'light' ? '#d0d7de' : '#30363d'
}

export function parseBorderString(raw: string | null): BorderDef | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed === 'none' || trimmed === '0px none transparent') {
    return { width: 0, style: 'none', color: 'transparent' }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const width = parseInt(parts[0], 10) || 1
    const style = (parts[1] as BorderDef['style']) || 'solid'
    const color = parts.slice(2).join(' ')
    return { width, style, color }
  }
  return null
}

function renderBorderAttr(border: BorderDef | null | undefined, sideName: string) {
  if (!border) return {}
  if (border.style === 'none' || border.width === 0) {
    return {
      [`data-border-${sideName}`]: 'none',
      style: `border-${sideName}: none !important`,
    }
  }
  const val = `${border.width}px ${border.style} ${border.color}`
  return {
    [`data-border-${sideName}`]: val,
    style: `border-${sideName}: ${val}`,
  }
}

// -----------------------------------------------------------------------------
// Extended TableRow with Height
// -----------------------------------------------------------------------------
export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: (element) => {
          const h = element.style.height || element.getAttribute('data-row-height')
          return h ? parseInt(h, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {}
          return {
            'data-row-height': `${attributes.height}`,
            style: `height: ${attributes.height}px`,
          }
        },
      },
    }
  },
})

// -----------------------------------------------------------------------------
// Extended TableCell & TableHeader with Border Attributes
// -----------------------------------------------------------------------------
const borderAttributes = {
  borderTop: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      return parseBorderString(element.getAttribute('data-border-top') || element.style.borderTop)
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      renderBorderAttr(attributes.borderTop as BorderDef | null | undefined, 'top'),
  },
  borderBottom: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      return parseBorderString(element.getAttribute('data-border-bottom') || element.style.borderBottom)
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      renderBorderAttr(attributes.borderBottom as BorderDef | null | undefined, 'bottom'),
  },
  borderLeft: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      return parseBorderString(element.getAttribute('data-border-left') || element.style.borderLeft)
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      renderBorderAttr(attributes.borderLeft as BorderDef | null | undefined, 'left'),
  },
  borderRight: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      return parseBorderString(element.getAttribute('data-border-right') || element.style.borderRight)
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      renderBorderAttr(attributes.borderRight as BorderDef | null | undefined, 'right'),
  },
}

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...borderAttributes,
    }
  },
})

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...borderAttributes,
    }
  },
})

// -----------------------------------------------------------------------------
// Border Application Engine using TableMap
// -----------------------------------------------------------------------------
export type BorderPreset = 'all' | 'outer' | 'inner' | 'none' | 'top' | 'bottom' | 'left' | 'right'

export function applyTableBorder(
  editor: Editor,
  preset: BorderPreset,
  borderDef: BorderDef
) {
  const { state, view } = editor
  const { selection, tr } = state
  const { $from } = selection

  // Locate parent table
  let tableDepth = -1
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d
      break
    }
  }
  if (tableDepth === -1) return false

  const tableStart = $from.start(tableDepth)
  const tableNode = $from.node(tableDepth)
  const map = TableMap.get(tableNode)

  // Identify selected cell offsets relative to table start
  const isCellSel = selection instanceof CellSelection
  let selectedOffsets: number[] = []

  if (isCellSel) {
    const sel = selection as CellSelection
    const rect = map.rectBetween(sel.$anchorCell.pos - tableStart, sel.$headCell.pos - tableStart)
    selectedOffsets = map.cellsInRect(rect)
  } else {
    // Single cell containing cursor
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        selectedOffsets = [$from.before(d) - tableStart]
        break
      }
    }
  }

  if (selectedOffsets.length === 0) return false

  const selectedSet = new Set(selectedOffsets)

  // Concrete value to set
  const borderValue: BorderDef =
    preset === 'none'
      ? { width: 0, style: 'none', color: 'transparent' }
      : {
          width: borderDef.width,
          style: borderDef.style,
          color: borderDef.color.startsWith('var') ? getThemeBorderColor() : borderDef.color,
        }

  // Iterate over each selected cell and determine affected sides
  selectedOffsets.forEach((offset) => {
    const cellPosInDoc = tableStart + offset
    const cellNode = state.doc.nodeAt(cellPosInDoc)
    if (!cellNode) return

    const cellRect = map.findCell(offset) // { left, top, right, bottom }
    const sidesToSet: ('top' | 'bottom' | 'left' | 'right')[] = []

    switch (preset) {
      case 'all':
      case 'none':
        sidesToSet.push('top', 'bottom', 'left', 'right')
        break

      case 'top':
        sidesToSet.push('top')
        break

      case 'bottom':
        sidesToSet.push('bottom')
        break

      case 'left':
        sidesToSet.push('left')
        break

      case 'right':
        sidesToSet.push('right')
        break

      case 'outer': {
        // Top outer edge: cell is on table boundary or all adjacent top slots are outside selection
        if (cellRect.top === 0) {
          sidesToSet.push('top')
        } else {
          let hasSelectedNeighborAbove = false
          for (let col = cellRect.left; col < cellRect.right; col++) {
            const neighborOffset = map.map[(cellRect.top - 1) * map.width + col]
            if (selectedSet.has(neighborOffset)) {
              hasSelectedNeighborAbove = true
              break
            }
          }
          if (!hasSelectedNeighborAbove) sidesToSet.push('top')
        }

        // Bottom outer edge
        if (cellRect.bottom === map.height) {
          sidesToSet.push('bottom')
        } else {
          let hasSelectedNeighborBelow = false
          for (let col = cellRect.left; col < cellRect.right; col++) {
            const neighborOffset = map.map[cellRect.bottom * map.width + col]
            if (selectedSet.has(neighborOffset)) {
              hasSelectedNeighborBelow = true
              break
            }
          }
          if (!hasSelectedNeighborBelow) sidesToSet.push('bottom')
        }

        // Left outer edge
        if (cellRect.left === 0) {
          sidesToSet.push('left')
        } else {
          let hasSelectedNeighborLeft = false
          for (let row = cellRect.top; row < cellRect.bottom; row++) {
            const neighborOffset = map.map[row * map.width + (cellRect.left - 1)]
            if (selectedSet.has(neighborOffset)) {
              hasSelectedNeighborLeft = true
              break
            }
          }
          if (!hasSelectedNeighborLeft) sidesToSet.push('left')
        }

        // Right outer edge
        if (cellRect.right === map.width) {
          sidesToSet.push('right')
        } else {
          let hasSelectedNeighborRight = false
          for (let row = cellRect.top; row < cellRect.bottom; row++) {
            const neighborOffset = map.map[row * map.width + cellRect.right]
            if (selectedSet.has(neighborOffset)) {
              hasSelectedNeighborRight = true
              break
            }
          }
          if (!hasSelectedNeighborRight) sidesToSet.push('right')
        }
        break
      }

      case 'inner': {
        // Inner borders only exist between adjacent selected cells
        if (cellRect.top > 0) {
          for (let col = cellRect.left; col < cellRect.right; col++) {
            const neighborOffset = map.map[(cellRect.top - 1) * map.width + col]
            if (selectedSet.has(neighborOffset)) {
              sidesToSet.push('top')
              break
            }
          }
        }

        if (cellRect.bottom < map.height) {
          for (let col = cellRect.left; col < cellRect.right; col++) {
            const neighborOffset = map.map[cellRect.bottom * map.width + col]
            if (selectedSet.has(neighborOffset)) {
              sidesToSet.push('bottom')
              break
            }
          }
        }

        if (cellRect.left > 0) {
          for (let row = cellRect.top; row < cellRect.bottom; row++) {
            const neighborOffset = map.map[row * map.width + (cellRect.left - 1)]
            if (selectedSet.has(neighborOffset)) {
              sidesToSet.push('left')
              break
            }
          }
        }

        if (cellRect.right < map.width) {
          for (let row = cellRect.top; row < cellRect.bottom; row++) {
            const neighborOffset = map.map[row * map.width + cellRect.right]
            if (selectedSet.has(neighborOffset)) {
              sidesToSet.push('right')
              break
            }
          }
        }
        break
      }
    }

    if (sidesToSet.length > 0) {
      const newAttrs = { ...cellNode.attrs }
      sidesToSet.forEach((side) => {
        if (side === 'top') newAttrs.borderTop = borderValue
        if (side === 'bottom') newAttrs.borderBottom = borderValue
        if (side === 'left') newAttrs.borderLeft = borderValue
        if (side === 'right') newAttrs.borderRight = borderValue
      })
      tr.setNodeMarkup(cellPosInDoc, null, newAttrs)
    }
  })

  view.dispatch(tr)
  editor.commands.focus()
  return true
}

/**
 * Update attributes (width, style, color) of existing active borders on selected cells.
 * If cells have no custom borders, does nothing and returns false.
 */
export function updateActiveCellBorders(
  editor: Editor,
  updates: Partial<BorderDef>
): boolean {
  if (!editor || !editor.isActive('table')) return false
  const { state, view } = editor
  const { selection, tr } = state
  const { $from } = selection

  let tableDepth = -1
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d
      break
    }
  }
  if (tableDepth === -1) return false

  const tableStart = $from.start(tableDepth)
  const tableNode = $from.node(tableDepth)
  const map = TableMap.get(tableNode)

  const isCellSel = selection instanceof CellSelection
  let selectedOffsets: number[] = []

  if (isCellSel) {
    const sel = selection as CellSelection
    const rect = map.rectBetween(sel.$anchorCell.pos - tableStart, sel.$headCell.pos - tableStart)
    selectedOffsets = map.cellsInRect(rect)
  } else {
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        selectedOffsets = [$from.before(d) - tableStart]
        break
      }
    }
  }

  if (selectedOffsets.length === 0) return false

  let modified = false
  selectedOffsets.forEach((offset) => {
    const cellPosInDoc = tableStart + offset
    const cellNode = state.doc.nodeAt(cellPosInDoc)
    if (!cellNode) return

    const sideKeys = ['borderTop', 'borderBottom', 'borderLeft', 'borderRight'] as const
    let cellChanged = false
    const newAttrs = { ...cellNode.attrs }

    sideKeys.forEach((key) => {
      const cur = cellNode.attrs[key] as BorderDef | null | undefined
      if (cur && cur.style !== 'none') {
        newAttrs[key] = {
          width: updates.width !== undefined ? updates.width : cur.width,
          style: updates.style !== undefined ? updates.style : cur.style,
          color:
            updates.color !== undefined
              ? updates.color.startsWith('var')
                ? getThemeBorderColor()
              : updates.color
              : cur.color,
        }
        cellChanged = true
      }
    })

    if (cellChanged) {
      tr.setNodeMarkup(cellPosInDoc, null, newAttrs)
      modified = true
    }
  })

  if (modified) {
    view.dispatch(tr)
    editor.commands.focus()
    return true
  }

  return false
}
