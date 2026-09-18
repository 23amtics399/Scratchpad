import type { DocumentRecord } from '@/types/index.js'
import { extractSearchableText } from '@/utils/textExtractor.js'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * ExportService — client-side document export engine for Markdown, HTML, Plain Text, and Document JSON.
 */
export class ExportService {
  /**
   * Exports a single document in the specified format and triggers a browser file download.
   */
  async exportDocument(doc: DocumentRecord, format: 'md' | 'html' | 'txt' | 'json'): Promise<void> {
    const title = (doc.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '_')

    switch (format) {
      case 'md': {
        const mdContent = this.#toMarkdown(doc)
        this.#downloadFile(mdContent, `${title}.md`, 'text/markdown;charset=utf-8')
        break
      }
      case 'html': {
        const htmlContent = this.#toHtmlDocument(doc)
        this.#downloadFile(htmlContent, `${title}.html`, 'text/html;charset=utf-8')
        break
      }
      case 'txt': {
        const plainText = extractSearchableText(doc.content, doc.type)
        this.#downloadFile(plainText, `${title}.txt`, 'text/plain;charset=utf-8')
        break
      }
      case 'json': {
        // Explicitly distinguish single Document JSON from full Workspace Backup JSON
        const payload = {
          format: 'scratchpad-document',
          version: 1,
          exportedAt: new Date().toISOString(),
          document: {
            id: doc.id,
            title: doc.title,
            type: doc.type,
            content: doc.content,
            wordCount: doc.wordCount,
            characterCount: doc.characterCount,
            tags: doc.tags || [],
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          },
        }
        const jsonStr = JSON.stringify(payload, null, 2)
        this.#downloadFile(jsonStr, `${title}.scratchpad.json`, 'application/json;charset=utf-8')
        break
      }
    }
  }

  /**
   * Invokes native browser print dialog for printing or saving to PDF.
   */
  print(): void {
    window.print()
  }

  // ---------------------------------------------------------------------------
  // Format Converters
  // ---------------------------------------------------------------------------

  #toMarkdown(doc: DocumentRecord): string {
    if (doc.type === 'markdown' || doc.type === 'plain') {
      return doc.content
    }

    // Convert Rich text JSON to clean markdown
    try {
      const json = JSON.parse(doc.content)
      const lines: string[] = []

      const walk = (node: Record<string, unknown>) => {
        if (!node) return
        const type = node.type as string

        if (type === 'heading') {
          const level = (node.attrs as { level?: number })?.level || 1
          const prefix = '#'.repeat(level) + ' '
          const text = this.#getNodeText(node)
          lines.push(`${prefix}${text}\n`)
          return
        }

        if (type === 'paragraph') {
          const text = this.#getNodeText(node)
          lines.push(text ? `${text}\n` : '\n')
          return
        }

        if (type === 'codeBlock') {
          const lang = (node.attrs as { language?: string })?.language || ''
          const text = this.#getNodeText(node)
          lines.push(`\`\`\`${lang}\n${text}\n\`\`\`\n`)
          return
        }

        if (type === 'blockquote') {
          const text = this.#getNodeText(node)
          lines.push(`> ${text}\n`)
          return
        }

        if (type === 'horizontalRule') {
          lines.push('---\n')
          return
        }

        if (type === 'bulletList' && Array.isArray(node.content)) {
          for (const item of node.content) {
            lines.push(`- ${this.#getNodeText(item as Record<string, unknown>)}`)
          }
          lines.push('\n')
          return
        }

        if (type === 'orderedList' && Array.isArray(node.content)) {
          let idx = 1
          for (const item of node.content) {
            lines.push(`${idx++}. ${this.#getNodeText(item as Record<string, unknown>)}`)
          }
          lines.push('\n')
          return
        }

        if (type === 'taskList' && Array.isArray(node.content)) {
          for (const item of node.content) {
            const task = item as Record<string, unknown>
            const checked = (task.attrs as { checked?: boolean })?.checked
            lines.push(`- [${checked ? 'x' : ' '}] ${this.#getNodeText(task)}`)
          }
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
      return extractSearchableText(doc.content, doc.type)
    }
  }

  #getNodeText(node: Record<string, unknown>): string {
    if (typeof node.text === 'string') return node.text
    if (Array.isArray(node.content)) {
      return node.content.map((c) => this.#getNodeText(c as Record<string, unknown>)).join('')
    }
    return ''
  }

  #toHtmlDocument(doc: DocumentRecord): string {
    let bodyHtml = ''

    if (doc.type === 'markdown') {
      const parsed = marked.parse(doc.content) as string
      bodyHtml = DOMPurify.sanitize(parsed)
    } else if (doc.type === 'plain') {
      bodyHtml = `<pre style="font-family: monospace; white-space: pre-wrap;">${this.#escapeHtml(
        doc.content
      )}</pre>`
    } else {
      // Rich text JSON
      bodyHtml = this.#richJsonToHtml(doc.content)
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.#escapeHtml(doc.title || 'Untitled')}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.3; }
    code { font-family: 'JetBrains Mono', Consolas, Monaco, monospace; background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #007acc; padding-left: 16px; color: #555; margin: 16px 0; font-style: italic; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    hr { border: none; border-top: 1px solid #e1e4e8; margin: 24px 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${this.#escapeHtml(doc.title || 'Untitled')}</h1>
  ${bodyHtml}
</body>
</html>`
  }

  #richJsonToHtml(rawJson: string): string {
    try {
      const doc = JSON.parse(rawJson)
      const render = (node: Record<string, unknown>): string => {
        if (!node) return ''
        const type = node.type as string

        if (type === 'text') {
          let text = this.#escapeHtml((node.text as string) || '')
          if (Array.isArray(node.marks)) {
            for (const mark of node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>) {
              if (mark.type === 'bold') text = `<strong>${text}</strong>`
              if (mark.type === 'italic') text = `<em>${text}</em>`
              if (mark.type === 'underline') text = `<u>${text}</u>`
              if (mark.type === 'strike') text = `<s>${text}</s>`
              if (mark.type === 'superscript') text = `<sup>${text}</sup>`
              if (mark.type === 'subscript') text = `<sub>${text}</sub>`
              if (mark.type === 'code') text = `<code>${text}</code>`
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
          default:
            return children
        }
      }

      return render(doc)
    } catch {
      return `<p>${this.#escapeHtml(rawJson)}</p>`
    }
  }

  #escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  #downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const exportService = new ExportService()
