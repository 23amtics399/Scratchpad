import type { DocumentType } from '@/types/index.js'

/**
 * Extracts clean, plain-text representation from document content for full-text search.
 *
 * For Rich text (Tiptap JSON):
 * Recursively visits all nodes and extracts the text content, completely ignoring
 * JSON keys, marks, formatting attributes, and structural boilerplate.
 *
 * For Markdown:
 * Strips formatting markers (headers, bold, italics, links, backticks) while preserving words.
 *
 * For Plain text:
 * Returns the raw text cleanly trimmed.
 */
export function extractSearchableText(content: string, type: DocumentType): string {
  if (!content || !content.trim()) {
    return ''
  }

  if (type === 'plain') {
    return content.trim()
  }

  if (type === 'rich') {
    return extractTextFromTiptapJson(content)
  }

  if (type === 'markdown') {
    return extractTextFromMarkdown(content)
  }

  return content.trim()
}

/**
 * Parses Tiptap JSON and traverses all text-bearing nodes.
 */
function extractTextFromTiptapJson(rawJson: string): string {
  try {
    const doc = JSON.parse(rawJson)
    const textParts: string[] = []

    // Recursive node visitor
    const visit = (node: unknown) => {
      if (!node || typeof node !== 'object') return

      const n = node as { text?: string; content?: unknown[]; type?: string; attrs?: Record<string, unknown> }

      if (typeof n.text === 'string' && n.text.length > 0) {
        textParts.push(n.text)
      }

      // If image node has caption or alt, include that in searchable text
      if (n.type === 'image' && n.attrs) {
        if (typeof n.attrs.caption === 'string' && n.attrs.caption) {
          textParts.push(n.attrs.caption)
        }
        if (typeof n.attrs.alt === 'string' && n.attrs.alt) {
          textParts.push(n.attrs.alt)
        }
      }

      if (Array.isArray(n.content)) {
        for (const child of n.content) {
          visit(child)
        }
      }
    }

    visit(doc)
    return textParts.join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    // If not valid JSON, treat as raw text without json delimiters
    return rawJson.replace(/[{}"[\]]/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/**
 * Strips common Markdown formatting symbols to leave searchable words.
 */
function extractTextFromMarkdown(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headers (#, ##, etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes (> )
    .replace(/^>\s+/gm, '')
    // Remove bold/italic (*, _, ~~)
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    // Remove list markers
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}
