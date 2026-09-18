import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

export interface IndentOptions {
  types: string[]
  minLevel: number
  maxLevel: number
}

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minLevel: 0,
      maxLevel: 8,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const dataIndent = element.getAttribute('data-indent')
              if (dataIndent) {
                const parsed = parseInt(dataIndent, 10)
                if (!Number.isNaN(parsed)) return parsed
              }
              const ml = element.style.marginLeft
              if (ml) {
                const px = parseInt(ml, 10)
                if (!Number.isNaN(px)) return Math.round(px / 24)
              }
              return 0
            },
            renderHTML: (attributes) => {
              const level = attributes.indent
              if (!level || level <= 0) {
                return {}
              }
              return {
                'data-indent': level,
                style: `margin-left: ${level * 24}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          const { from, to } = selection

          let applicable = false

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              applicable = true
              const currentIndent = (node.attrs.indent as number) || 0
              if (currentIndent < this.options.maxLevel) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                })
              }
            }
          })

          if (applicable && dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },

      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          const { from, to } = selection

          let applicable = false

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              applicable = true
              const currentIndent = (node.attrs.indent as number) || 0
              if (currentIndent > this.options.minLevel) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1,
                })
              }
            }
          })

          if (applicable && dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // In lists, allow list-keymap to handle nesting
        if (
          this.editor.isActive('listItem') ||
          this.editor.isActive('taskItem')
        ) {
          return false
        }
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        // In lists, allow list-keymap to handle un-nesting
        if (
          this.editor.isActive('listItem') ||
          this.editor.isActive('taskItem')
        ) {
          return false
        }
        return this.editor.commands.outdent()
      },
    }
  },
})
