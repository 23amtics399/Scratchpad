import { useState, useEffect, useRef } from 'react'
import { X, Copy, Check, Share2, Mail, Send, ExternalLink, MessageCircle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext.js'
import './ShareModal.css'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

const CANONICAL_URL = 'https://scratchpad.sji.one/'
const SHARE_TITLE = 'Scratchpad — Free Local-First Writing Workspace | SJI'
const SHARE_SUMMARY =
  'Scratchpad is a free, local-first writing workspace with rich text, Markdown, table editing, and 100% private browser storage.'

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [copiedInstagram, setCopiedInstagram] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!isOpen) return

    setCopied(false)
    setCopiedInstagram(false)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(CANONICAL_URL)
      } else {
        // Fallback for older browsers
        const input = document.createElement('input')
        input.value = CANONICAL_URL
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      showToast({ message: 'Canonical link copied to clipboard!', type: 'success' })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast({ message: 'Failed to copy link. Please copy manually.', type: 'error' })
    }
  }

  const handleCopyForInstagram = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(CANONICAL_URL)
      }
      setCopiedInstagram(true)
      showToast({
        message: 'Link copied! Paste into your Instagram Bio or Story link sticker.',
        type: 'success',
      })
      setTimeout(() => setCopiedInstagram(false), 3000)
    } catch {
      showToast({ message: 'Failed to copy link.', type: 'error' })
    }
  }

  const handleNativeShare = async () => {
    if (!hasNativeShare) return
    try {
      await navigator.share({
        title: SHARE_TITLE,
        text: SHARE_SUMMARY,
        url: CANONICAL_URL,
      })
      showToast({ message: 'Shared successfully!', type: 'success' })
      onClose()
    } catch (err) {
      // User cancellation throws AbortError; only show error if not user abort
      if (err instanceof Error && err.name !== 'AbortError') {
        showToast({ message: 'Native sharing was canceled or unsupported.', type: 'info' })
      }
    }
  }

  // Pre-encoded destination URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${SHARE_TITLE}\n${CANONICAL_URL}`
  )}`

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    SHARE_TITLE
  )}&url=${encodeURIComponent(CANONICAL_URL)}`

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    CANONICAL_URL
  )}`

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    CANONICAL_URL
  )}`

  const emailUrl = `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(
    `Hi,\n\nI wanted to share Scratchpad with you — it's a free, local-first writing workspace with rich text, Markdown, table editing, and 100% private in-browser storage:\n\n${CANONICAL_URL}\n\nNo accounts, no cloud setup, and loads instantly.`
  )}`

  return (
    <div className="share-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-modal__header">
          <div className="share-modal__title-group">
            <Share2 size={20} className="share-modal__header-icon" />
            <div>
              <h2 id="share-modal-title" className="share-modal__title">
                Share Scratchpad
              </h2>
              <p className="share-modal__subtitle">
                Recommend Scratchpad to friends, colleagues, and teams
              </p>
            </div>
          </div>
          <button
            type="button"
            className="share-modal__close-btn"
            onClick={onClose}
            aria-label="Close Share dialog"
          >
            <X size={18} />
          </button>
        </header>

        <div className="share-modal__body">
          {/* Quick Copy Link Box */}
          <div className="share-modal__link-box">
            <input
              type="text"
              readOnly
              value={CANONICAL_URL}
              className="share-modal__link-input"
              aria-label="Scratchpad canonical link"
            />
            <button
              type="button"
              className={`share-modal__copy-btn ${copied ? 'share-modal__copy-btn--copied' : ''}`}
              onClick={handleCopyLink}
              title="Copy canonical link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Native Share button if supported */}
          {hasNativeShare && (
            <button
              type="button"
              className="share-modal__native-share-btn"
              onClick={handleNativeShare}
            >
              <Share2 size={16} />
              <span>Share via Device Sheet (Web Share API)</span>
            </button>
          )}

          {/* Social Platforms Grid */}
          <div className="share-modal__grid" aria-label="Social sharing channels">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="share-modal__channel-item share-modal__channel--whatsapp"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
              <ExternalLink size={12} className="share-modal__ext-icon" />
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="share-modal__channel-item share-modal__channel--x"
            >
              <Send size={18} />
              <span>X (Twitter)</span>
              <ExternalLink size={12} className="share-modal__ext-icon" />
            </a>

            {/* LinkedIn */}
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="share-modal__channel-item share-modal__channel--linkedin"
            >
              <Share2 size={18} />
              <span>LinkedIn</span>
              <ExternalLink size={12} className="share-modal__ext-icon" />
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="share-modal__channel-item share-modal__channel--facebook"
            >
              <Globe size={18} />
              <span>Facebook</span>
              <ExternalLink size={12} className="share-modal__ext-icon" />
            </a>

            {/* Email */}
            <a href={emailUrl} className="share-modal__channel-item share-modal__channel--email">
              <Mail size={18} />
              <span>Email</span>
            </a>
          </div>

          {/* Instagram Sharing Helper */}
          <div className="share-modal__instagram-card">
            <div className="share-modal__instagram-header">
              <InstagramIcon size={18} className="share-modal__instagram-icon" />
              <span className="share-modal__instagram-title">Instagram Sharing</span>
            </div>
            <p className="share-modal__instagram-desc">
              Instagram does not support web URL intents. Copy the link below and add it to your
              Instagram Bio or use the <strong>Link sticker</strong> in Instagram Stories.
            </p>
            <button
              type="button"
              className="share-modal__instagram-btn"
              onClick={handleCopyForInstagram}
            >
              {copiedInstagram ? <Check size={14} /> : <Copy size={14} />}
              <span>
                {copiedInstagram ? 'Link Copied for Instagram!' : 'Copy Link for Instagram'}
              </span>
            </button>
          </div>
        </div>

        <footer className="share-modal__footer">
          <button type="button" className="share-modal__done-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}

function InstagramIcon(props: { size?: number; className?: string }) {
  return (
    <svg
      width={props.size || 18}
      height={props.size || 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function Globe(props: { size?: number }) {
  return (
    <svg
      width={props.size || 18}
      height={props.size || 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}
