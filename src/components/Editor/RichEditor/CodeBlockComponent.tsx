import { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { Copy, Check, Hash, WrapText } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext.js'
import { POPULAR_LANGUAGES } from './lowlightSetup.js'
import './CodeBlockComponent.css'

export function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const language = (node.attrs.language as string) || 'plaintext'
  const showLineNumbers = Boolean(node.attrs.showLineNumbers)
  const wordWrap = Boolean(node.attrs.wordWrap)

  const handleCopy = async () => {
    try {
      const code = node.textContent
      await navigator.clipboard.writeText(code)
      setCopied(true)
      showToast({ message: 'Code copied to clipboard', type: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback if clipboard API is unavailable
      const textArea = document.createElement('textarea')
      textArea.value = node.textContent
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      showToast({ message: 'Code copied to clipboard', type: 'success' })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAttributes({ language: e.target.value })
  }

  const toggleLineNumbers = () => {
    updateAttributes({ showLineNumbers: !showLineNumbers })
  }

  const toggleWordWrap = () => {
    updateAttributes({ wordWrap: !wordWrap })
  }

  return (
    <NodeViewWrapper
      className={`code-block-wrapper ${showLineNumbers ? 'code-block-wrapper--numbers' : ''} ${wordWrap ? 'code-block-wrapper--wrap' : ''}`}
    >
      <div className="code-block-header" contentEditable={false}>
        {/* Language selector */}
        <div className="code-block-lang">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="code-block-lang-select"
            aria-label="Code language"
          >
            {POPULAR_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="code-block-actions">
          <button
            type="button"
            className={`code-block-btn ${showLineNumbers ? 'code-block-btn--active' : ''}`}
            onClick={toggleLineNumbers}
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            aria-label="Toggle line numbers"
          >
            <Hash size={13} />
          </button>

          <button
            type="button"
            className={`code-block-btn ${wordWrap ? 'code-block-btn--active' : ''}`}
            onClick={toggleWordWrap}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
            aria-label="Toggle word wrap"
          >
            <WrapText size={13} />
          </button>

          <button
            type="button"
            className={`code-block-btn ${copied ? 'code-block-btn--copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy code'}
            aria-label="Copy code to clipboard"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="code-block-btn-label">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <pre className="code-block-pre">
        <NodeViewContent as="code" className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  )
}
