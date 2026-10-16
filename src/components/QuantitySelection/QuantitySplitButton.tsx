import { useRef, useState, type ReactNode } from 'react'
import { useTimerPress } from '../CraftTimer/useTimerPress'
import { createQueueSubmissionGuard } from '../../features/builds/SubmissionGuard'
import QuantityDialog from './QuantityDialog'
import './QuantitySelection.css'
export default function QuantitySplitButton({ title, name, quantityLabel, children, onAdd, disabled = false, primaryClassName = 'primary-button', className = '', tourTarget, canChoose }: {
  title: string; name: string; quantityLabel: string; children: ReactNode; onAdd: (quantity: number) => boolean | void;
  disabled?: boolean; primaryClassName?: string; className?: string; tourTarget?: string; canChoose?: () => boolean
}) {
  const [open, setOpen] = useState(false), [submit] = useState(() => createQueueSubmissionGuard())
  const primary = useRef<HTMLButtonElement>(null), arrow = useRef<HTMLButtonElement>(null), trigger = useRef<HTMLButtonElement | null>(null)
  function choose(button: HTMLButtonElement | null) { if (!disabled && (!canChoose || canChoose())) { trigger.current = button; setOpen(true) } }
  function add(quantity: number) { return submit(() => { if (disabled) return false; const result = onAdd(quantity); if (result === false) return false; setOpen(false); return true }, String(quantity)) }
  const press = useTimerPress(() => { add(1) }, () => choose(primary.current))
  return <><span className={`quantity-split ${className}`}>
    <button ref={primary} type="button" className={primaryClassName} data-tour-target={tourTarget} disabled={disabled} {...press}>{children}</button>
    <button ref={arrow} type="button" className="secondary-button quantity-split-arrow" aria-label={quantityLabel} aria-haspopup="dialog" disabled={disabled} onClick={() => choose(arrow.current)}>▼</button>
  </span>{open && <QuantityDialog title={title} name={name} onConfirm={add} onCancel={() => { setOpen(false); queueMicrotask(() => trigger.current?.focus()) }}/>}</>
}
