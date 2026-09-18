import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formattingStyles: {
      setLineHeight: (lineHeight: string) => ReturnType
      unsetLineHeight: () => ReturnType
      setLetterSpacing: (letterSpacing: string) => ReturnType
      unsetLetterSpacing: () => ReturnType
      setParagraphSpacing: (paragraphSpacing: string) => ReturnType
      unsetParagraphSpacing: () => ReturnType
    }
  }
}

export const FormattingStyles = Extension.create({
  name: 'formattingStyles',

  addGlobalAttributes() {
    return [
      // 1. Line Height on block elements
      {
        types: ['paragraph', 'heading', 'blockquote'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
      // 2. Letter Spacing on inline textStyle
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) return {}
              return { style: `letter-spacing: ${attributes.letterSpacing}` }
            },
          },
        },
      },
      // 3. Paragraph Spacing (margin-bottom) on block elements
      {
        types: ['paragraph', 'heading', 'blockquote'],
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {}
              return { style: `margin-bottom: ${attributes.paragraphSpacing}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection
          const blockTypes = ['paragraph', 'heading', 'blockquote']

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (blockTypes.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight,
              })
            }
          })

          if (dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },

      unsetLineHeight:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection
          const blockTypes = ['paragraph', 'heading', 'blockquote']

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (blockTypes.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: null,
              })
            }
          })

          if (dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },

      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { letterSpacing }).run()
        },

      unsetLetterSpacing:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { letterSpacing: null }).removeEmptyTextStyle().run()
        },

      setParagraphSpacing:
        (paragraphSpacing: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection
          const blockTypes = ['paragraph', 'heading', 'blockquote']

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (blockTypes.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                paragraphSpacing,
              })
            }
          })

          if (dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },

      unsetParagraphSpacing:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection
          const blockTypes = ['paragraph', 'heading', 'blockquote']

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (blockTypes.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                paragraphSpacing: null,
              })
            }
          })

          if (dispatch) {
            dispatch(tr)
            return true
          }
          return false
        },
    }
  },
})
