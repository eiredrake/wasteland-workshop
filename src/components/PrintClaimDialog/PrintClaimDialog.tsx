import { useEffect,useId,useRef } from 'react'
import './PrintClaimDialog.css'
export default function PrintClaimDialog({name,onCancel,onClaim,disabled=false,error}:{name:string;onCancel:()=>void;onClaim:()=>void;disabled?:boolean;error?:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId()
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
 return <dialog ref={dialog} className="print-claim-dialog" aria-labelledby={label} onCancel={event=>{event.preventDefault();onCancel()}}>
 <p id={label}>Print is identified as <strong>{name}</strong></p>
 {error&&<p role="alert">{error}</p>}
 <div className="print-claim-actions"><button autoFocus type="button" className="blueprint-access-status blueprint-access-status-untracked" onClick={onCancel}>Cancel</button><button type="button" className="blueprint-access-status blueprint-access-status-acquired" disabled={disabled} onClick={onClaim}>Claim</button></div>
 </dialog>
}
