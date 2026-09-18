import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const TableRowResizer = Extension.create({
  name: 'tableRowResizer',

  addProseMirrorPlugins() {
    let activeRow: HTMLTableRowElement | null = null
    let isDragging = false
    let startY = 0
    let startHeight = 0
    let hoverIndicator: HTMLDivElement | null = null
    let dragGuide: HTMLDivElement | null = null

    const removeHoverIndicator = () => {
      if (hoverIndicator && hoverIndicator.parentNode) {
        hoverIndicator.parentNode.removeChild(hoverIndicator)
      }
      hoverIndicator = null
    }

    const removeDragGuide = () => {
      if (dragGuide && dragGuide.parentNode) {
        dragGuide.parentNode.removeChild(dragGuide)
      }
      dragGuide = null
    }

    return [
      new Plugin({
        key: new PluginKey('tableRowResizer'),
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (isDragging) return false

              const target = event.target as HTMLElement | null
              if (!target) {
                removeHoverIndicator()
                return false
              }

              // Column tooltip affordance when hovering column resize handle
              if (target.classList.contains('column-resize-handle') || target.closest('.column-resize-handle')) {
                target.setAttribute('title', 'Drag to resize column')
              }

              const cell = target.closest('td, th') as HTMLElement | null
              const row = cell?.closest('tr') as HTMLTableRowElement | null
              const table = row?.closest('table') as HTMLTableElement | null

              if (!cell || !row || !table) {
                removeHoverIndicator()
                activeRow = null
                view.dom.classList.remove('row-resize-cursor')
                return false
              }

              const rowRect = row.getBoundingClientRect()
              const tableRect = table.getBoundingClientRect()

              // Check if pointer is near bottom boundary of the row (within 4px => 8px hit area)
              const distToBottom = Math.abs(event.clientY - rowRect.bottom)
              const isNearBottom = distToBottom <= 4

              if (isNearBottom) {
                activeRow = row
                view.dom.classList.add('row-resize-cursor')

                // Position hover indicator along the row boundary
                if (!hoverIndicator) {
                  hoverIndicator = document.createElement('div')
                  hoverIndicator.className = 'table-row-resize-handle'
                  hoverIndicator.setAttribute('title', 'Drag to resize row')
                  document.body.appendChild(hoverIndicator)
                }

                hoverIndicator.style.top = `${rowRect.bottom - 2}px`
                hoverIndicator.style.left = `${tableRect.left}px`
                hoverIndicator.style.width = `${tableRect.width}px`
                hoverIndicator.style.height = '4px'
              } else {
                if (activeRow === row) {
                  activeRow = null
                  view.dom.classList.remove('row-resize-cursor')
                  removeHoverIndicator()
                }
              }

              return false
            },

            mouseleave: (view) => {
              if (!isDragging) {
                activeRow = null
                view.dom.classList.remove('row-resize-cursor')
                removeHoverIndicator()
              }
              return false
            },

            mousedown: (view, event) => {
              if (!activeRow) return false

              const table = activeRow.closest('table') as HTMLTableElement | null
              if (!table) return false

              isDragging = true
              startY = event.clientY
              startHeight = activeRow.getBoundingClientRect().height
              const tableRect = table.getBoundingClientRect()

              // Create dragging horizontal guide line
              dragGuide = document.createElement('div')
              dragGuide.className = 'table-row-resize-guide'
              document.body.appendChild(dragGuide)
              dragGuide.style.top = `${event.clientY}px`
              dragGuide.style.left = `${tableRect.left}px`
              dragGuide.style.width = `${tableRect.width}px`

              document.body.classList.add('row-resizing-active')
              removeHoverIndicator()

              const onMouseMove = (moveEvent: MouseEvent) => {
                if (!isDragging || !dragGuide) return
                dragGuide.style.top = `${moveEvent.clientY}px`
              }

              const onMouseUp = (upEvent: MouseEvent) => {
                isDragging = false
                document.body.classList.remove('row-resizing-active')
                view.dom.classList.remove('row-resize-cursor')
                removeDragGuide()

                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('mouseup', onMouseUp)

                const deltaY = upEvent.clientY - startY
                const newHeight = Math.max(28, Math.round(startHeight + deltaY))

                // Find ProseMirror node pos for activeRow
                try {
                  const targetCell = activeRow?.querySelector('td, th')
                  if (targetCell) {
                    const pos = view.posAtDOM(targetCell, 0)
                    const $pos = view.state.doc.resolve(pos)
                    for (let d = $pos.depth; d > 0; d--) {
                      const node = $pos.node(d)
                      if (node.type.name === 'tableRow') {
                        const rowPos = $pos.before(d)
                        const tr = view.state.tr.setNodeMarkup(rowPos, null, {
                          ...node.attrs,
                          height: newHeight,
                        })
                        view.dispatch(tr)
                        break
                      }
                    }
                  }
                } catch {
                  // Fallback: set DOM height directly if pos calculation is hindered
                  if (activeRow) {
                    activeRow.style.height = `${newHeight}px`
                  }
                }

                activeRow = null
                view.focus()
              }

              window.addEventListener('mousemove', onMouseMove)
              window.addEventListener('mouseup', onMouseUp)

              event.preventDefault()
              event.stopPropagation()
              return true
            },
          },
        },
      }),
    ]
  },
})
