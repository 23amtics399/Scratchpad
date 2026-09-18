import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const TableActiveFeedback = Extension.create({
  name: 'tableActiveFeedback',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableActiveFeedback'),
        props: {
          decorations: (state) => {
            const { selection } = state
            const { $from } = selection
            let tablePos: number | null = null
            let cellPos: number | null = null

            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d)
              if (
                cellPos === null &&
                (node.type.name === 'tableCell' || node.type.name === 'tableHeader')
              ) {
                cellPos = $from.before(d)
              }
              if (node.type.name === 'table') {
                tablePos = $from.before(d)
                break
              }
            }

            if (tablePos !== null) {
              const decos: Decoration[] = []
              const tableNode = state.doc.nodeAt(tablePos)
              if (tableNode) {
                decos.push(
                  Decoration.node(tablePos, tablePos + tableNode.nodeSize, {
                    class: 'has-active-table',
                  })
                )
              }
              if (cellPos !== null) {
                const cellNode = state.doc.nodeAt(cellPos)
                if (cellNode) {
                  decos.push(
                    Decoration.node(cellPos, cellPos + cellNode.nodeSize, {
                      class: 'has-active-cell',
                    })
                  )
                }
              }
              return DecorationSet.create(state.doc, decos)
            }

            return DecorationSet.empty
          },
        },
      }),
    ]
  },
})
