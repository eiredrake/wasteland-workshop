import {useEffect,useId,useRef,useState} from 'react'
import SearchablePicker from '../../components/SearchablePicker/SearchablePicker'
import {masterBlueprints} from '../blueprints/blueprints'
import type {CatalogEntry} from '../../services/scanner/BlueprintMatcher'

export default function ManualPrintDialog({message,collectionName,alreadyOwned,onAcquire,onCancel}:{message:string;collectionName:string;alreadyOwned:(id:number)=>boolean;onAcquire:(blueprint:CatalogEntry)=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),messageId=useId()
 const [selected,setSelected]=useState<CatalogEntry>()
 const owned=selected?alreadyOwned(selected.id):false
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
 return <dialog ref={dialog} className="confirmation-dialog scanner-manual-dialog" aria-labelledby={titleId} aria-describedby={messageId} onCancel={onCancel}>
  <h3 id={titleId}>SELECT PRINT</h3>
  <p>Active collection: {collectionName}</p>
  <p id={messageId} role="status">{message}</p>
  <SearchablePicker label="Blueprint name" options={masterBlueprints} getOptionKey={item=>item.id} getOptionLabel={item=>item.name} onChange={setSelected} placeholder="Type or select a blueprint"/>
  {owned&&<p role="status">{selected?.name} is already in the active collection "{collectionName}".</p>}
  {/* Keep the open picker from collapsing between pointer down and click. */}
  <div className="confirmation-dialog-actions" onPointerDown={event=>event.preventDefault()}>
   <button type="button" className="secondary-button" autoFocus onClick={onCancel}>{owned?'Done':'Cancel'}</button>
   {!owned&&<button type="button" className="primary-button" disabled={!selected} onClick={()=>{if(selected)onAcquire(selected)}}>Acquire</button>}
  </div>
 </dialog>
}
