/**
 * Storage failure detection and quota diagnostics utility.
 */

export interface StorageDiagnostics {
  usage: number
  quota: number
  percent: number
  text: string
}

/**
 * Checks if an error is a browser storage quota exceeded error.
 * Handles DOMException, Dexie-wrapped inner errors, Firefox quota codes, etc.
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    // Standard DOMException name
    if (e.name === 'QuotaExceededError') return true
    // Dexie / wrapper inner error
    if (e.inner && typeof e.inner === 'object') {
      const inner = e.inner as Record<string, unknown>
      if (inner.name === 'QuotaExceededError') return true
      if (typeof inner.message === 'string' && /quota/i.test(inner.message)) return true
    }
    // Firefox legacy code
    if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
    // Standard DOMException code 22 / legacy code 1014
    if (e.code === 22 || e.code === 1014) return true
    // Fallback message inspection
    if (typeof e.message === 'string' && /quota/i.test(e.message)) return true
  }
  return false
}

/**
 * Retrieves storage usage diagnostics using navigator.storage.estimate() where supported.
 */
export async function getStorageDiagnostics(): Promise<StorageDiagnostics | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      const percent = quota > 0 ? Math.round((usage / quota) * 100) : 0
      const usageMB = (usage / (1024 * 1024)).toFixed(1)
      const quotaMB = (quota / (1024 * 1024)).toFixed(1)
      return {
        usage,
        quota,
        percent,
        text: `${usageMB} MB of ${quotaMB} MB (${percent}%) used`,
      }
    } catch {
      return null
    }
  }
  return null
}
