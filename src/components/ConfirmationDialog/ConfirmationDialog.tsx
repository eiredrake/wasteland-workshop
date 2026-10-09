import { useEffect, useId, useRef } from 'react'
import './ConfirmationDialog.css'
export default function ConfirmationDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Delete' }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId(), messageId = useId()
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} className="confirmation-dialog" aria-labelledby={titleId} aria-describedby={messageId} onCancel={onCancel}>
    <h3 id={titleId}>{title}</h3><p id={messageId}>{message}</p>
    <div className="confirmation-dialog-actions"><button type="button" className="secondary-button" autoFocus onClick={onCancel}>Cancel</button>
      <button type="button" className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>
}
