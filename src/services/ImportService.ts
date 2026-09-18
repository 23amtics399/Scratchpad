import DOMPurify from 'dompurify'
import type { DocumentType, WorkspaceBackup } from '@/types/index.js'
import { workspaceService } from './WorkspaceService.js'

export type ImportResult =
  | {
      kind: 'workspace-backup'
      data: WorkspaceBackup
    }
  | {
      kind: 'single-document'
      title: string
      type: DocumentType
      content: string
    }

export class ImportService {
  /**
   * Parses an uploaded file and returns an ImportResult.
   *
   * HTML content is unconditionally sanitized via DOMPurify before returning.
   * Single document JSON and Workspace Backup JSON are cleanly distinguished.
   */
  async parseImportFile(file: File): Promise<ImportResult> {
    const filename = file.name
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const baseTitle = filename.replace(/\.[^/.]+$/, '') || 'Imported Document'

    const text = await file.text()

    if (ext === 'json') {
      try {
        const parsed = JSON.parse(text)

        // 1. Full Workspace Backup (strictly validated)
        if (parsed.format === 'scratchpad-workspace' && workspaceService.validateBackup(parsed)) {
          return {
            kind: 'workspace-backup',
            data: parsed as WorkspaceBackup,
          }
        }

        // 2. Single Document JSON
        if (parsed.format === 'scratchpad-document' && parsed.document) {
          const doc = parsed.document
          return {
            kind: 'single-document',
            title: doc.title || baseTitle,
            type: doc.type || 'rich',
            content: doc.content || '',
          }
        }

        // 3. Raw Tiptap Doc JSON
        if (parsed.type === 'doc') {
          return {
            kind: 'single-document',
            title: baseTitle,
            type: 'rich',
            content: JSON.stringify(parsed),
          }
        }
      } catch (err) {
        console.error('Invalid JSON file:', err)
      }
    }

    // HTML Import — must pass through DOMPurify
    if (ext === 'html' || ext === 'htm') {
      const sanitized = DOMPurify.sanitize(text, {
        USE_PROFILES: { html: true },
      })
      return {
        kind: 'single-document',
        title: baseTitle,
        type: 'rich',
        content: sanitized,
      }
    }

    // Markdown Import — remains raw markdown source
    if (ext === 'md' || ext === 'markdown') {
      return {
        kind: 'single-document',
        title: baseTitle,
        type: 'markdown',
        content: text,
      }
    }

    // Plain Text or fallback
    return {
      kind: 'single-document',
      title: baseTitle,
      type: 'plain',
      content: text,
    }
  }
}

export const importService = new ImportService()
