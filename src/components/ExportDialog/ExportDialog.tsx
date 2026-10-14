import {useEffect,useId,useRef,useState} from 'react'
import {saveExportFile,supportsSavePicker} from '../../services/files/SaveFile'
import type {ReactNode} from 'react'
import type {ExportFile,ExportFormat} from '../../services/files/SaveFile'
export default function ExportDialog({title:heading,description,subject,createFile,onClose,onExported}:{title:string;description:ReactNode;subject:string;createFile:(format:ExportFormat)=>ExportFile;onClose:()=>void;onExported:(message:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),busy=useRef(false),title=useId(),label=useId()
 const [format,setFormat]=useState<ExportFormat>('json'),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const picker=supportsSavePicker()
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[])
 async function save(){
  if(busy.current)return
  busy.current=true;setSaving(true);setError('')
  try{
   const result=await saveExportFile(createFile(format))
   if(result!=='cancelled'){onExported(subject+(result==='saved'?' saved.':' download started.'));onClose()}
  }catch(cause){setError('Could not export '+subject.toLowerCase()+'. '+(cause instanceof Error?cause.message:String(cause)))}
  finally{busy.current=false;setSaving(false)}
 }
 return <dialog ref={dialog} aria-labelledby={title} onCancel={event=>{event.preventDefault();if(!busy.current)onClose()}}>
  <h3 id={title}>{heading}</h3>
  <p>{description}</p>
  <label htmlFor={label}>File format</label>{' '}
  <select id={label} value={format} disabled={saving} onChange={event=>setFormat(event.target.value as ExportFormat)}><option value="json">JSON — complete records</option><option value="csv">CSV — spreadsheet</option></select>
  <p>{picker?'Choose the file name and save location in the next window.':'The file will download to the browser download folder (usually Downloads).'}</p>
  {error&&<p role="alert">{error}</p>}
  <div className="confirmation-dialog-actions"><button type="button" className="secondary-button" autoFocus disabled={saving} onClick={onClose}>Cancel</button><button type="button" className="primary-button" disabled={saving} onClick={()=>{void save()}}>{saving?'Saving...':picker?'Save File':'Download File'}</button></div>
 </dialog>
}
