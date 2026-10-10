import { useEffect, useRef } from 'react'
import { X, ExternalLink, ShieldCheck, Wrench, Globe, BookOpen } from 'lucide-react'
import './AboutModal.css'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="about-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="about-modal__header">
          <div className="about-modal__brand">
            <div className="about-modal__logo" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="var(--sp-color-accent, #0f6cbd)" />
                <path
                  d="M8 9h16M8 15h12M8 21h14M8 26h8"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h2 id="about-modal-title" className="about-modal__title">
                Scratchpad
              </h2>
              <p className="about-modal__version">
                Version 1.0.0 · Free Local-First Writing Workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            className="about-modal__close-btn"
            onClick={onClose}
            aria-label="Close About dialog"
          >
            <X size={18} />
          </button>
        </header>

        <div className="about-modal__body">
          <section className="about-modal__section">
            <h3 className="about-modal__section-title">
              <Globe size={16} />
              <span>Published by SJI</span>
            </h3>
            <p className="about-modal__text">
              Scratchpad is an open, private writing workspace in the SJI ecosystem. Built for
              writers, developers, and thinkers who value instant loading and total data ownership.
            </p>
            <div className="about-modal__links">
              <a
                href="https://sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__link-badge"
              >
                <span>SJI Homepage</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="https://sji.one/products/scratchpad"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__link-badge"
              >
                <span>Scratchpad on SJI</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </section>

          <section className="about-modal__section">
            <h3 className="about-modal__section-title">
              <ShieldCheck size={16} />
              <span>Privacy & Storage Architecture</span>
            </h3>
            <p className="about-modal__text">
              <strong>100% Client-Side:</strong> All documents, folders, snapshots, and workspace
              preferences reside entirely in your browser's IndexedDB storage via Dexie.
            </p>
            <ul className="about-modal__list">
              <li>
                <strong>Zero Accounts:</strong> No sign-up, passwords, or emails needed.
              </li>
              <li>
                <strong>Zero Cloud Sync:</strong> Your notes are never sent to external servers or
                telemetry systems.
              </li>
              <li>
                <strong>Full Portability:</strong> Back up and restore anytime via{' '}
                <em>File → Export Workspace Backup</em>.
              </li>
            </ul>
            <p className="about-modal__text-muted">
              Learn more about browser storage standards on the{' '}
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__inline-link"
              >
                MDN IndexedDB Documentation
              </a>
              .
            </p>
          </section>

          <section className="about-modal__section">
            <h3 className="about-modal__section-title">
              <BookOpen size={16} />
              <span>Editing Engines & Technology</span>
            </h3>
            <p className="about-modal__text">Engineered with modern web standards:</p>
            <ul className="about-modal__list">
              <li>
                <strong>Rich Text:</strong> Powered by{' '}
                <a
                  href="https://tiptap.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-modal__inline-link"
                >
                  Tiptap
                </a>{' '}
                and ProseMirror with desktop table controls, custom borders, and typography.
              </li>
              <li>
                <strong>Markdown & Plain Text:</strong> Powered by{' '}
                <a
                  href="https://codemirror.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-modal__inline-link"
                >
                  CodeMirror 6
                </a>{' '}
                with live syntax highlighting.
              </li>
              <li>
                <strong>Core Framework:</strong> React 19, TypeScript, and Vite 8.
              </li>
            </ul>
          </section>

          <section className="about-modal__section">
            <h3 className="about-modal__section-title">
              <Wrench size={16} />
              <span>More Web Products from SJI</span>
            </h3>
            <div className="about-modal__grid">
              <a
                href="https://tools.sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__grid-item"
              >
                <span className="about-modal__grid-title">Tools</span>
                <span className="about-modal__grid-desc">Image & PDF utilities in browser</span>
              </a>
              <a
                href="https://calc.sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__grid-item"
              >
                <span className="about-modal__grid-title">Calc</span>
                <span className="about-modal__grid-desc">Fast everyday calculations</span>
              </a>
              <a
                href="https://time.sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__grid-item"
              >
                <span className="about-modal__grid-title">Time</span>
                <span className="about-modal__grid-desc">World clocks, timers & stopwatch</span>
              </a>
              <a
                href="https://shorty.sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__grid-item"
              >
                <span className="about-modal__grid-title">Shorty</span>
                <span className="about-modal__grid-desc">Simple, clean URL shortening</span>
              </a>
              <a
                href="https://tempbox.sji.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-modal__grid-item"
              >
                <span className="about-modal__grid-title">TempBox</span>
                <span className="about-modal__grid-desc">Disposable temporary email</span>
              </a>
            </div>
          </section>
        </div>

        <footer className="about-modal__footer">
          <p className="about-modal__copyright">© 2026 SJI. Useful software for the web.</p>
          <button type="button" className="about-modal__done-btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
