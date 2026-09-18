import { useState } from 'react'
import { AlertTriangle, Download, X } from 'lucide-react'
import { useUI } from '@/contexts/UIContext.js'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { useToast } from '@/contexts/ToastContext.js'
import './StorageBanner.css'

export function StorageBanner() {
  const { storageBanner, dismissStorageBanner } = useUI()
  const { workspace } = useWorkspace()
  const { showToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  if (!storageBanner) return null

  const handleBackup = async () => {
    if (!workspace) return
    setIsExporting(true)
    try {
      const backup = await workspaceService.generateBackup(workspace.id, true)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `scratchpad-emergency-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast({
        message: 'Workspace backup exported successfully.',
        type: 'success',
      })
    } catch (err) {
      console.error('Backup failed:', err)
      showToast({
        message: 'Failed to create workspace backup.',
        type: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <aside
      id="scratchpad-storage-banner"
      className={`storage-banner ${storageBanner.isQuota ? 'storage-banner--quota' : 'storage-banner--error'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="storage-banner__content">
        <AlertTriangle size={18} className="storage-banner__icon" aria-hidden="true" />
        <div className="storage-banner__text">
          <strong className="storage-banner__message">{storageBanner.message}</strong>
          <span className="storage-banner__recommendation">
            We recommend exporting your workspace to prevent data loss.{' '}
            {storageBanner.diagnostics && <span className="storage-banner__diag">({storageBanner.diagnostics})</span>}
          </span>
        </div>
      </div>

      <div className="storage-banner__actions">
        <button
          id="storage-banner-btn-backup"
          type="button"
          className="storage-banner__btn storage-banner__btn--backup"
          onClick={handleBackup}
          disabled={isExporting}
        >
          <Download size={14} />
          <span>{isExporting ? 'Exporting…' : 'Backup Workspace'}</span>
        </button>

        <button
          id="storage-banner-btn-dismiss"
          type="button"
          className="storage-banner__btn storage-banner__btn--dismiss"
          onClick={dismissStorageBanner}
          title="Dismiss banner"
          aria-label="Dismiss storage warning"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  )
}
