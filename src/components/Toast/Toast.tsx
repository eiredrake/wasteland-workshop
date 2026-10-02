export type ToastType = 'success' | 'info' | 'warning' | 'error'

export type ToastMessage = {
  id: number
  message: string
  type: ToastType
}

type ToastProps = {
  toast: ToastMessage
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div className={`toast toast-${toast.type}`} role="status">
      <span className="toast-message">{toast.message}</span>

      <button
        type="button"
        className="toast-dismiss"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  )
}

export default Toast