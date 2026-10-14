import { useEffect, useId, useRef, type ReactNode } from 'react'
import './ConfirmationDialog.css'
export default function ConfirmationDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Delete', tone = 'neutral', showCancel = true, confirmVariant }: {
  title: string; message: ReactNode; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; tone?: 'neutral'|'success'|'danger'; showCancel?: boolean; confirmVariant?: 'primary'|'secondary'|'danger'
}) {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId(), messageId = useId()
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} className={`confirmation-dialog confirmation-dialog-${tone}`} aria-labelledby={titleId} aria-describedby={messageId} onCancel={onCancel}>
    <h3 id={titleId}>{title}</h3><p id={messageId}>{message}</p>
    <div className="confirmation-dialog-actions">{showCancel&&<button type="button" className="secondary-button" autoFocus onClick={onCancel}>Cancel</button>}
      <button type="button" className={confirmVariant?confirmVariant+'-button':tone==='success'?'secondary-button':'danger-button'} autoFocus={!showCancel} onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>
}
