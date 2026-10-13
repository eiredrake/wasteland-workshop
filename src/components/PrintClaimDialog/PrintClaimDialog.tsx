import { useEffect,useId,useRef } from 'react'
import BackButton from '../BackButton/BackButton'
import './PrintClaimDialog.css'
export default function PrintClaimDialog({name,onCancel,onClaim,onRetry,alreadyAcquired=false,disabled=false,error}:{name?:string;onCancel:()=>void;onClaim?:()=>void;onRetry?:()=>void;alreadyAcquired?:boolean;disabled?:boolean;error?:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId()
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
 return <dialog ref={dialog} className={`print-claim-dialog${name?'':' print-claim-failed'}`} aria-labelledby={label} onCancel={event=>{event.preventDefault();onCancel()}}>
 <p id={label}>{name?<><span className="blueprint-access-status blueprint-access-status-acquired">Blueprint identified</span><strong>{name}</strong></>:'Unable to identify blueprint'}</p>
 {error&&<p role="alert">{error}</p>}
 <div className="print-claim-actions"><BackButton onClick={onCancel}>Back</BackButton>{name?<button type="button" className="blueprint-access-status blueprint-access-status-acquired" disabled={disabled||alreadyAcquired} onClick={onClaim}>{alreadyAcquired?'Already acquired':'Claim Blueprint'}</button>:<button type="button" className="blueprint-access-status blueprint-access-status-to-acquire" disabled={disabled} onClick={onRetry}>Try again</button>}</div>
 </dialog>
}
