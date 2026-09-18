import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useToast, type ToastType } from '@/contexts/ToastContext.js'
import './Toast.css'

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="toast-icon toast-icon--success" />
      case 'warning':
        return <AlertTriangle size={16} className="toast-icon toast-icon--warning" />
      case 'error':
        return <AlertCircle size={16} className="toast-icon toast-icon--error" />
      case 'info':
      default:
        return <Info size={16} className="toast-icon toast-icon--info" />
    }
  }

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-item--${toast.type}`} role="status">
          {getIcon(toast.type)}
          <span className="toast-message">{toast.message}</span>

          {toast.action && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                toast.action?.onClick()
                dismissToast(toast.id)
              }}
            >
              {toast.action.label}
            </button>
          )}

          <button
            type="button"
            className="toast-dismiss-btn"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
