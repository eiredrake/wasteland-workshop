import {useEffect,useId,useRef} from 'react'
import './LoadingDialog.css'
export default function LoadingDialog({title,message}:{title:string;message:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId(),description=useId()
 useEffect(()=>{const element=dialog.current;element?.showModal();element?.focus();return()=>element?.close()},[])
 return <dialog ref={dialog} tabIndex={-1} className="loading-dialog" aria-labelledby={label} aria-describedby={description} aria-busy="true" onCancel={event=>event.preventDefault()}><h3 id={label}>{title}</h3><div className="loading-dialog-spinner" aria-hidden="true"/><p id={description} role="status">{message}</p></dialog>
}
