import { useEffect, useId, useRef, useState } from 'react'
import type { Build } from '../../features/builds/Build'
import './TimerConfiguration.css'
export default function TimerConfiguration({build,onApply,onClose}:{build:Build;onApply:(minutes:number)=>boolean;onClose:()=>void}) {
  const [minutes,setMinutes] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId()
  const editable = build.status === 'Working' || build.status === 'Paused'
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() },[])
  return <dialog ref={dialog} className="timer-configuration" aria-labelledby={titleId} onCancel={onClose}>
    <h2 id={titleId}>Timer Settings</h2><h3>{build.blueprintName}</h3>
    <p>{build.status} · Remaining: {Math.ceil(build.timer.remainingMs / 1000)} seconds</p>
    <p>Working timers keep running while this panel is open. Apply adds or subtracts from the time remaining then.</p>
    {!editable && <p>Start this Build before adjusting its timer. Completed Builds cannot be adjusted.</p>}
    <div className="timer-configuration-adjust"><button type="button" disabled={!editable} aria-label="Subtract one minute from adjustment" onClick={() => setMinutes(value => value-1)}>−1 min</button>
      <output aria-live="polite">{minutes > 0 ? '+' : ''}{minutes} min</output>
      <button type="button" disabled={!editable} aria-label="Add one minute to adjustment" onClick={() => setMinutes(value => value+1)}>+1 min</button></div>
    <div className="timer-configuration-actions"><button type="button" autoFocus onClick={onClose}>Cancel</button><button type="button" disabled={!editable || minutes === 0} onClick={() => { if (onApply(minutes)) onClose() }}>Apply</button></div>
  </dialog>
}
