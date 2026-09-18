import { useState, useEffect } from 'react'
import {
  X,
  Palette,
  Type,
  Database,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  HardDrive,
  AlertTriangle,
} from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext.js'
import { useWorkspace } from '@/contexts/WorkspaceContext.js'
import { useToast } from '@/contexts/ToastContext.js'
import { workspaceService } from '@/services/WorkspaceService.js'
import { db } from '@/storage/db.js'
import type { SettingsRecord, DocumentType } from '@/types/index.js'
import './SettingsDialog.css'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'appearance' | 'editor' | 'storage' | 'about'

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettings()
  const { documents, workspace, reload } = useWorkspace()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [attachmentCount, setAttachmentCount] = useState(0)
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)
  const [storageEstimate, setStorageEstimate] = useState<string>('Calculating…')

  // Calculate local storage stats
  useEffect(() => {
    if (isOpen) {
      db.attachments.count().then(setAttachmentCount)

      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          const usageMB = ((est.usage || 0) / (1024 * 1024)).toFixed(2)
          const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0)
          setStorageEstimate(`${usageMB} MB of ${quotaMB} MB used`)
        })
      } else {
        setStorageEstimate('Supported')
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Wipe data completely
  const handleWipeData = async () => {
    await db.delete()
    window.location.reload()
  }

  // Export workspace backup
  const handleExportBackup = async () => {
    if (!workspace) return
    try {
      const backup = await workspaceService.generateBackup(workspace.id, true)
      const jsonStr = JSON.stringify(backup, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scratchpad-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast({ message: 'Workspace backup exported successfully', type: 'success' })
    } catch {
      showToast({ message: 'Failed to export workspace backup', type: 'error' })
    }
  }

  // Restore backup file selection
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspace) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string)
        if (json.format === 'scratchpad-workspace' && workspaceService.validateBackup(json)) {
          await workspaceService.restoreBackup(json, workspace.id, 'merge')
          await reload()
          showToast({ message: 'Workspace restored successfully', type: 'success' })
          onClose()
        } else {
          showToast({ message: 'Invalid Scratchpad workspace backup file', type: 'error' })
        }
      } catch {
        showToast({ message: 'Failed to parse backup JSON file', type: 'error' })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-label="Application Settings"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-title">Settings</div>
          <button type="button" className="settings-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Layout: Sidebar Navigation + Content */}
        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings categories">
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === 'appearance' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette size={15} />
              <span>Appearance</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === 'editor' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Type size={15} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === 'storage' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('storage')}
            >
              <Database size={15} />
              <span>Storage & Data</span>
            </button>
            <button
              type="button"
              className={`settings-nav-btn ${activeTab === 'about' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <ShieldCheck size={15} />
              <span>About & Privacy</span>
            </button>
          </nav>

          <div className="settings-content">
            {/* 1. Appearance */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h2 className="settings-section-title">Appearance & Themes</h2>

                <div className="settings-field">
                  <label htmlFor="theme-select" className="settings-label">Color Theme</label>
                  <select
                    id="theme-select"
                    className="settings-select"
                    value={settings.theme}
                    onChange={(e) =>
                      updateSettings({ theme: e.target.value as SettingsRecord['theme'] })
                    }
                  >
                    <option value="system">System Default</option>
                    <option value="dark">Scratchpad Dark</option>
                    <option value="light">Scratchpad Light</option>
                    <option value="one-dark">One Dark</option>
                    <option value="dracula">Dracula</option>
                    <option value="nord">Nord</option>
                    <option value="monokai">Monokai</option>
                    <option value="solarized-dark">Solarized Dark</option>
                    <option value="solarized-light">Solarized Light</option>
                    <option value="high-contrast">High Contrast</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="ui-density-select" className="settings-label">UI Density</label>
                  <select
                    id="ui-density-select"
                    className="settings-select"
                    value={settings.uiDensity}
                    onChange={(e) =>
                      updateSettings({ uiDensity: e.target.value as SettingsRecord['uiDensity'] })
                    }
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="ui-scale-slider" className="settings-label">UI Scale ({settings.uiScale}%)</label>
                  <input
                    id="ui-scale-slider"
                    type="range"
                    min="75"
                    max="150"
                    step="5"
                    value={settings.uiScale}
                    onChange={(e) => updateSettings({ uiScale: parseInt(e.target.value, 10) })}
                    className="settings-range"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="accent-color-picker" className="settings-label">Accent Color</label>
                  <div className="settings-color-row">
                    <input
                      id="accent-color-picker"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => updateSettings({ accentColor: e.target.value })}
                      className="settings-color-input"
                    />
                    <span className="settings-color-val">{settings.accentColor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Editor */}
            {activeTab === 'editor' && (
              <div className="settings-section">
                <h2 className="settings-section-title">Editor Preferences</h2>

                <div className="settings-field">
                  <label htmlFor="editor-font-select" className="settings-label">Default Editor Font</label>
                  <select
                    id="editor-font-select"
                    className="settings-select"
                    value={settings.fontFamily}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  >
                    <option value="Inter, system-ui, sans-serif">Inter (Sans-serif)</option>
                    <option value="'JetBrains Mono', monospace">JetBrains Mono (Monospace)</option>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="editor-font-size-input" className="settings-label">Default Font Size (px)</label>
                  <input
                    id="editor-font-size-input"
                    type="number"
                    min="12"
                    max="32"
                    value={settings.fontSize}
                    onChange={(e) =>
                      updateSettings({ fontSize: Math.max(10, parseInt(e.target.value, 10) || 16) })
                    }
                    className="settings-input settings-input--num"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="editor-line-height-select" className="settings-label">Line Height</label>
                  <select
                    id="editor-line-height-select"
                    className="settings-select"
                    value={String(settings.lineHeight)}
                    onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })}
                  >
                    <option value="1.4">1.4 (Compact)</option>
                    <option value="1.6">1.6 (Normal)</option>
                    <option value="1.8">1.8 (Relaxed)</option>
                    <option value="2.0">2.0 (Double)</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="default-doc-type-select" className="settings-label">Default Document Format</label>
                  <select
                    id="default-doc-type-select"
                    className="settings-select"
                    value={settings.defaultDocumentType}
                    onChange={(e) =>
                      updateSettings({ defaultDocumentType: e.target.value as DocumentType })
                    }
                  >
                    <option value="rich">Rich Text</option>
                    <option value="markdown">Markdown</option>
                    <option value="plain">Plain Text</option>
                  </select>
                </div>

                <div className="settings-field settings-field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.wordWrap}
                      onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
                    />
                    <span>Word wrap by default</span>
                  </label>
                </div>

                <div className="settings-field settings-field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.spellCheck}
                      onChange={(e) => updateSettings({ spellCheck: e.target.checked })}
                    />
                    <span>Browser native spell check</span>
                  </label>
                </div>

                <div className="settings-field settings-field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.showLineNumbers}
                      onChange={(e) => updateSettings({ showLineNumbers: e.target.checked })}
                    />
                    <span>Show line numbers in code/plain modes</span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Storage & Data */}
            {activeTab === 'storage' && (
              <div className="settings-section">
                <h2 className="settings-section-title">Local Storage & Backups</h2>

                <div className="settings-storage-stats">
                  <div className="stat-box">
                    <HardDrive size={18} />
                    <div className="stat-info">
                      <span className="stat-value">{documents.length}</span>
                      <span className="stat-label">Documents</span>
                    </div>
                  </div>
                  <div className="stat-box">
                    <Database size={18} />
                    <div className="stat-info">
                      <span className="stat-value">{attachmentCount}</span>
                      <span className="stat-label">Attachments</span>
                    </div>
                  </div>
                  <div className="stat-box">
                    <ShieldCheck size={18} />
                    <div className="stat-info">
                      <span className="stat-value">{storageEstimate}</span>
                      <span className="stat-label">IndexedDB</span>
                    </div>
                  </div>
                </div>

                <div className="settings-btn-group">
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn--primary"
                    onClick={handleExportBackup}
                  >
                    <Download size={14} style={{ marginRight: 6 }} />
                    Export Full Workspace Backup (.json)
                  </button>

                  <label className="settings-action-btn settings-action-btn--file">
                    <Upload size={14} style={{ marginRight: 6 }} />
                    Restore Workspace Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreFile}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                <div className="settings-danger-zone">
                  <h3 className="danger-title">Danger Zone</h3>
                  <p className="danger-desc">
                    Wipes all documents, folders, attachments, and snapshots from your browser's IndexedDB.
                  </p>
                  {showWipeConfirm ? (
                    <div className="wipe-confirm-box">
                      <div className="wipe-confirm-text">
                        <AlertTriangle size={14} />
                        Are you absolutely sure? This action cannot be undone unless you have a backup.
                      </div>
                      <div className="wipe-actions">
                        <button
                          type="button"
                          className="danger-btn danger-btn--confirm"
                          onClick={handleWipeData}
                        >
                          Yes, Delete Everything
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => setShowWipeConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => setShowWipeConfirm(true)}
                    >
                      <Trash2 size={13} style={{ marginRight: 6 }} />
                      Delete All Local Data
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. About & Privacy */}
            {activeTab === 'about' && (
              <div className="settings-section">
                <h2 className="settings-section-title">About Scratchpad</h2>

                <div className="about-privacy-box">
                  <div className="privacy-badge">
                    <ShieldCheck size={18} />
                    <strong>100% Local-First & Privacy-Focused</strong>
                  </div>
                  <p className="privacy-statement">
                    Your Scratchpad documents never leave your browser. Scratchpad has no servers,
                    no authentication, no cloud database, and no telemetry tracking. Everything is saved
                    in your device's browser IndexedDB.
                  </p>
                  <p className="privacy-statement">
                    You own your data. Regularly export workspace backups to safeguard against browser cache clearing.
                  </p>
                </div>

                <div className="about-meta-grid">
                  <div className="about-meta-row">
                    <span className="about-meta-label">Application:</span>
                    <span className="about-meta-value">Scratchpad IDE</span>
                  </div>
                  <div className="about-meta-row">
                    <span className="about-meta-label">Version:</span>
                    <span className="about-meta-value">1.0.0 (Phase 4 Release)</span>
                  </div>
                  <div className="about-meta-row">
                    <span className="about-meta-label">Storage Engine:</span>
                    <span className="about-meta-value">IndexedDB / Dexie 4.4</span>
                  </div>
                  <div className="about-meta-row">
                    <span className="about-meta-label">Rich Text Engine:</span>
                    <span className="about-meta-value">Tiptap 2.27 / ProseMirror</span>
                  </div>
                  <div className="about-meta-row">
                    <span className="about-meta-label">Code & Source Engine:</span>
                    <span className="about-meta-value">CodeMirror 6</span>
                  </div>
                  <div className="about-meta-row">
                    <span className="about-meta-label">Offline Status:</span>
                    <span className="about-meta-value" style={{ color: '#58a6ff' }}>
                      Operational without internet
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
