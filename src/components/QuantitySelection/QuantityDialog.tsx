import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BATCH_QUANTITIES, requireBatchQuantity } from '../../features/batch/BatchQuantity'
import '../ConfirmationDialog/ConfirmationDialog.css'
import './QuantitySelection.css'
export default function QuantityDialog({ title, name, onConfirm, onCancel, confirmationLabel = quantity => `Add ${quantity}` }: {
  title: string; name: string; onConfirm: (quantity: number) => boolean | void | Promise<boolean | void>; onCancel: () => void;
  confirmationLabel?: (quantity: number) => string
}) {
  const dialog = useRef<HTMLDialogElement>(null), busy = useRef(false), titleId = useId(), quantityId = useId(), nameId = useId()
  const [quantity, setQuantity] = useState(1), [processing, setProcessing] = useState(false), [error, setError] = useState('')
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  async function confirm() {
    if (busy.current) return
    busy.current = true; setProcessing(true); setError('')
    try {
      const result = await onConfirm(requireBatchQuantity(quantity))
      if (result === false) setError('Nothing was added. Check the error message and your selections, then try again.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Nothing was added. Please try again.') }
    finally { busy.current = false; setProcessing(false) }
  }
  const content = <dialog ref={dialog} className="confirmation-dialog quantity-dialog" aria-labelledby={titleId} aria-describedby={nameId}
    onCancel={event => { event.preventDefault(); if (!busy.current) onCancel() }}>
    <h3 id={titleId}>{title}</h3><p id={nameId}>{name}</p>
    <label htmlFor={quantityId}>Number of instances</label>
    <select autoFocus id={quantityId} value={quantity} disabled={processing} onChange={event => setQuantity(Number(event.target.value))}>
      {BATCH_QUANTITIES.map(value => <option key={value} value={value}>{value}</option>)}
    </select>
    {error && <p role="alert">{error}</p>}
    <div className="confirmation-dialog-actions"><button type="button" className="secondary-button" disabled={processing} onClick={onCancel}>Cancel</button>
      <button type="button" className="primary-button" disabled={processing} onClick={() => void confirm()}>{processing ? 'AddingÃ¢â‚¬Â¦' : confirmationLabel(quantity)}</button></div>
  </dialog>
  return typeof document === 'undefined' ? content : createPortal(content, document.querySelector('main') ?? document.body)
}
