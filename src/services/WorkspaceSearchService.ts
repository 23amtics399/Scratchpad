import { documentRepository } from '@/storage/repositories/index.js'
import type { DocumentMeta, DocumentType } from '@/types/index.js'

export interface WorkspaceSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  typeFilter?: DocumentType | 'all'
}

export interface WorkspaceSearchResult {
  document: DocumentMeta
  matchCount: number
  snippet: string
  matchesInTitle: boolean
}

/**
 * WorkspaceSearchService — scans derived metadata (title + searchText + tags)
 * across the local workspace without loading full document trees into React state.
 */
export class WorkspaceSearchService {
  async search(
    workspaceId: string,
    query: string,
    options: WorkspaceSearchOptions = {}
  ): Promise<WorkspaceSearchResult[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    const { caseSensitive = false, wholeWord = false, typeFilter = 'all' } = options

    // Fetch all metadata (never loads full content)
    const allMeta = await documentRepository.getAllMeta(workspaceId)

    // Construct search regex safely
    let flags = 'g'
    if (!caseSensitive) flags += 'i'
    let escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) {
      escaped = `\\b${escaped}\\b`
    }

    let regex: RegExp
    try {
      regex = new RegExp(escaped, flags)
    } catch {
      return []
    }

    const results: WorkspaceSearchResult[] = []

    for (const doc of allMeta) {
      // Apply type filter if requested
      if (typeFilter !== 'all' && doc.type !== typeFilter) {
        continue
      }

      let matchCount = 0
      let matchesInTitle = false
      let snippet = ''

      // Check title
      const titleMatches = doc.title.match(regex)
      if (titleMatches) {
        matchCount += titleMatches.length
        matchesInTitle = true
      }

      // Check tags
      if (Array.isArray(doc.tags)) {
        for (const tag of doc.tags) {
          const tagMatches = tag.match(regex)
          if (tagMatches) matchCount += tagMatches.length
        }
      }

      // Check searchText
      if (doc.searchText) {
        const textMatches = doc.searchText.match(regex)
        if (textMatches) {
          matchCount += textMatches.length

          // Extract a preview snippet around the first match
          const matchIndex = doc.searchText.search(regex)
          if (matchIndex >= 0) {
            const start = Math.max(0, matchIndex - 40)
            const end = Math.min(doc.searchText.length, matchIndex + trimmed.length + 60)
            const prefix = start > 0 ? '…' : ''
            const suffix = end < doc.searchText.length ? '…' : ''
            snippet = prefix + doc.searchText.slice(start, end).trim() + suffix
          }
        }
      }

      if (matchCount > 0) {
        results.push({
          document: doc,
          matchCount,
          snippet: snippet || (matchesInTitle ? 'Match found in document title' : 'Match found'),
          matchesInTitle,
        })
      }
    }

    // Sort by match count descending, then by last updated
    return results.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
      return b.document.updatedAt - a.document.updatedAt
    })
  }
}

export const workspaceSearchService = new WorkspaceSearchService()
