import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { DocumentType } from '@/types/index.js'
import { extractSearchableText } from '@/utils/textExtractor.js'

/**
 * Escapes HTML characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Extracts plain text from a node recursively.
 */
function getNodeText(node: Record<string, unknown>): string {
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    return node.content.map((c) => getNodeText(c as Record<string, unknown>)).join('')
  }
  return ''
}

/**
 * Converts Tiptap rich JSON to Markdown text.
 */
export function richToMarkdown(rawJson: string): string {
  try {
    const json = JSON.parse(rawJson)
    const lines: string[] = []

    const walk = (node: Record<string, unknown>) => {
      if (!node) return
      const type = node.type as string

      if (type === 'heading') {
        const level = (node.attrs as { level?: number })?.level || 1
        const prefix = '#'.repeat(level) + ' '
        const text = getNodeText(node)
        lines.push(`${prefix}${text}\n`)
        return
      }

      if (type === 'paragraph') {
        const text = getNodeText(node)
        lines.push(text ? `${text}\n` : '\n')
        return
      }

      if (type === 'codeBlock') {
        const lang = (node.attrs as { language?: string })?.language || ''
        const text = getNodeText(node)
        lines.push(`\`\`\`${lang}\n${text}\n\`\`\`\n`)
        return
      }

      if (type === 'blockquote') {
        const text = getNodeText(node)
        lines.push(`> ${text}\n`)
        return
      }

      if (type === 'horizontalRule') {
        lines.push('---\n')
        return
      }

      if (type === 'bulletList' && Array.isArray(node.content)) {
        for (const item of node.content) {
          lines.push(`- ${getNodeText(item as Record<string, unknown>)}`)
        }
        lines.push('\n')
        return
      }

      if (type === 'orderedList' && Array.isArray(node.content)) {
        let idx = 1
        for (const item of node.content) {
          lines.push(`${idx++}. ${getNodeText(item as Record<string, unknown>)}`)
        }
        lines.push('\n')
        return
      }

      if (type === 'taskList' && Array.isArray(node.content)) {
        for (const item of node.content) {
          const task = item as Record<string, unknown>
          const checked = (task.attrs as { checked?: boolean })?.checked
          lines.push(`- [${checked ? 'x' : ' '}] ${getNodeText(task)}`)
        }
        lines.push('\n')
        return
      }

      if (type === 'table' && Array.isArray(node.content)) {
        const rows = node.content as Array<Record<string, unknown>>
        rows.forEach((row, rIdx) => {
          const cells = (row.content as Array<Record<string, unknown>>) || []
          const cellTexts = cells.map((c) => getNodeText(c).trim())
          lines.push(`| ${cellTexts.join(' | ')} |`)
          if (rIdx === 0) {
            lines.push(`| ${cellTexts.map(() => '---').join(' | ')} |`)
          }
        })
        lines.push('\n')
        return
      }

      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          walk(child as Record<string, unknown>)
        }
      }
    }

    walk(json)
    return lines.join('\n').trim()
  } catch {
    return extractSearchableText(rawJson, 'rich')
  }
}

/**
 * Converts Tiptap rich JSON to sanitized HTML.
 */
export function richToHtml(rawJson: string): string {
  try {
    const doc = JSON.parse(rawJson)
    const render = (node: Record<string, unknown>): string => {
      if (!node) return ''
      const type = node.type as string

      if (type === 'text') {
        let text = escapeHtml((node.text as string) || '')
        if (Array.isArray(node.marks)) {
          for (const mark of node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>) {
            if (mark.type === 'bold') text = `<strong>${text}</strong>`
            if (mark.type === 'italic') text = `<em>${text}</em>`
            if (mark.type === 'underline') text = `<u>${text}</u>`
            if (mark.type === 'strike') text = `<s>${text}</s>`
            if (mark.type === 'superscript') text = `<sup>${text}</sup>`
            if (mark.type === 'subscript') text = `<sub>${text}</sub>`
            if (mark.type === 'code') text = `<code>${text}</code>`
            if (mark.type === 'link') {
              const href = escapeHtml((mark.attrs?.href as string) || '#')
              text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
            }
            if (mark.type === 'highlight') {
              const color = mark.attrs?.color || '#ffec3d'
              text = `<mark style="background-color: ${color}">${text}</mark>`
            }
            if (mark.type === 'textStyle') {
              const styles: string[] = []
              if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`)
              if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`)
              if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`)
              if (mark.attrs?.letterSpacing) styles.push(`letter-spacing: ${mark.attrs.letterSpacing}`)
              if (styles.length > 0) text = `<span style="${styles.join('; ')}">${text}</span>`
            }
          }
        }
        return text
      }

      const children = Array.isArray(node.content)
        ? (node.content as Array<Record<string, unknown>>).map(render).join('')
        : ''

      const attrs = (node.attrs as Record<string, unknown>) || {}
      const styleList: string[] = []
      if (attrs.textAlign) styleList.push(`text-align: ${attrs.textAlign}`)
      if (attrs.indent && Number(attrs.indent) > 0) {
        styleList.push(`margin-left: ${Number(attrs.indent) * 24}px`)
      }
      if (attrs.lineHeight) styleList.push(`line-height: ${attrs.lineHeight}`)
      if (attrs.paragraphSpacing) styleList.push(`margin-bottom: ${attrs.paragraphSpacing}`)
      const styleAttr = styleList.length > 0 ? ` style="${styleList.join('; ')}"` : ''

      switch (type) {
        case 'paragraph':
          return `<p${styleAttr}>${children || '<br>'}</p>`
        case 'heading': {
          const level = attrs.level || 1
          return `<h${level}${styleAttr}>${children}</h${level}>`
        }
        case 'blockquote':
          return `<blockquote>${children}</blockquote>`
        case 'codeBlock': {
          const lang = attrs.language ? ` class="language-${attrs.language}"` : ''
          return `<pre><code${lang}>${children}</code></pre>`
        }
        case 'horizontalRule':
          return `<hr>`
        case 'bulletList':
          return `<ul>${children}</ul>`
        case 'orderedList':
          return `<ol>${children}</ol>`
        case 'listItem':
          return `<li>${children}</li>`
        case 'taskList':
          return `<ul style="list-style: none; padding-left: 0;">${children}</ul>`
        case 'taskItem': {
          const checked = attrs.checked ? ' checked disabled' : ' disabled'
          return `<li><input type="checkbox"${checked}> ${children}</li>`
        }
        case 'table':
          return `<table>${children}</table>`
        case 'tableRow': {
          const rowStyle = attrs.height ? ` style="height: ${attrs.height}px" data-row-height="${attrs.height}"` : ''
          return `<tr${rowStyle}>${children}</tr>`
        }
        case 'tableHeader':
        case 'tableCell': {
          const isHeader = type === 'tableHeader'
          const tag = isHeader ? 'th' : 'td'
          const styles: string[] = []
          const dataAttrs: string[] = []
          ;(['top', 'bottom', 'left', 'right'] as const).forEach((side) => {
            const borderKey = `border${side.charAt(0).toUpperCase() + side.slice(1)}`
            const val = attrs[borderKey] as { width?: number; style?: string; color?: string } | string | undefined
            if (val) {
              if (typeof val === 'string') {
                styles.push(`border-${side}: ${val}`)
                dataAttrs.push(`data-border-${side}="${val}"`)
              } else if (val.style === 'none' || val.width === 0) {
                styles.push(`border-${side}: none !important`)
                dataAttrs.push(`data-border-${side}="none"`)
              } else {
                const str = `${val.width}px ${val.style} ${val.color}`
                styles.push(`border-${side}: ${str}`)
                dataAttrs.push(`data-border-${side}="${str}"`)
              }
            }
          })
          if (attrs.colspan && Number(attrs.colspan) > 1) dataAttrs.push(`colspan="${attrs.colspan}"`)
          if (attrs.rowspan && Number(attrs.rowspan) > 1) dataAttrs.push(`rowspan="${attrs.rowspan}"`)
          const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : ''
          const extraAttrs = dataAttrs.length ? ` ${dataAttrs.join(' ')}` : ''
          return `<${tag}${styleAttr}${extraAttrs}>${children}</${tag}>`
        }
        case 'callout': {
          const calloutType = attrs.type || 'info'
          return `<div class="callout callout--${calloutType}">${children}</div>`
        }
        default:
          return children
      }
    }

    return render(doc)
  } catch {
    return `<p>${escapeHtml(rawJson)}</p>`
  }
}

/**
 * Converts Markdown to sanitized HTML for consumption by Tiptap Rich text editor.
 */
export function markdownToRich(markdown: string): string {
  const parsed = marked.parse(markdown) as string
  return DOMPurify.sanitize(parsed, {
    USE_PROFILES: { html: true },
  })
}

/**
 * Converts HTML to sanitized HTML safe for Rich Text ingestion.
 */
export function htmlToRich(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  })
}

/**
 * Converts Plain Text to a basic Tiptap JSON structure.
 */
export function plainToRich(plain: string): string {
  const lines = plain.split('\n')
  const paragraphs = lines.map((line) => {
    if (!line.trim()) return { type: 'paragraph' }
    return {
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    }
  })
  return JSON.stringify({
    type: 'doc',
    content: paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' }],
  })
}

/**
 * Converts Rich JSON to Plain Text.
 */
export function richToPlain(richJson: string): string {
  return extractSearchableText(richJson, 'rich')
}

/**
 * Central document converter routing any format to any format.
 */
export function convertDocumentContent(
  content: string,
  fromType: DocumentType,
  toType: DocumentType
): string {
  if (fromType === toType) return content

  // 1. From Rich
  if (fromType === 'rich') {
    if (toType === 'markdown') return richToMarkdown(content)
    if (toType === 'plain') return richToPlain(content)
  }

  // 2. To Rich
  if (toType === 'rich') {
    if (fromType === 'markdown') return markdownToRich(content)
    if (fromType === 'plain') return plainToRich(content)
  }

  // 3. Markdown <-> Plain
  if (fromType === 'markdown' && toType === 'plain') {
    return extractSearchableText(content, 'markdown')
  }
  if (fromType === 'plain' && toType === 'markdown') {
    return content // Raw plain text is valid markdown
  }

  return content
}
