import Toast, { type ToastMessage } from './Toast'
import './Toast.css'

type ToastContainerProps = {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

export default ToastContainer