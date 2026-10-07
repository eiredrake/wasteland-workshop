import { useEffect, useId, useRef } from 'react'

export default function ShoppingConfirmationDialog({ title, message, onConfirm, onCancel }: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return <dialog ref={dialog} className="shopping-confirmation" aria-labelledby={titleId}
    aria-describedby={messageId} onCancel={onCancel}>
    <h3 id={titleId}>{title}</h3>
    <p id={messageId}>{message}</p>
    <div className="shopping-confirmation-actions">
      <button type="button" className="secondary-button" autoFocus onClick={onCancel}>Cancel</button>
      <button type="button" className="primary-button" onClick={onConfirm}>Remove</button>
    </div>
  </dialog>
}
