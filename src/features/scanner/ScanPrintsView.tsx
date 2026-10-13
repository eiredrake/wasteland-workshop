import {useRef,useState} from 'react'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import './ScanPrintsView.css'
type SelectionResult={filename:string}|{error:string}
export default function ScanPrintsView(){
 const input=useRef<HTMLInputElement>(null),chooseButton=useRef<HTMLButtonElement>(null)
 const [result,setResult]=useState<SelectionResult>()
 function failure(error:unknown){setResult({error:error instanceof Error?error.message:String(error)})}
 function choose(){try{if(input.current){input.current.value='';input.current.click()}}catch(error){failure(error)}}
 function selected(){try{const file=input.current?.files?.[0];if(file)setResult({filename:file.name})}catch(error){failure(error)}finally{if(input.current)input.current.value=''}}
 function close(){setResult(undefined);requestAnimationFrame(()=>chooseButton.current?.focus())}
 return <section aria-label="Scan Prints"><h2>Scan Prints</h2>
 <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.webm,image/jpeg,image/png,image/webp,video/webm" hidden onChange={selected}/>
 <div className="scan-prints-entry-actions"><button ref={chooseButton} type="button" className="primary-button primary-button-cream" onClick={choose}>Choose Image</button></div>
 {result&&<ConfirmationDialog title={'filename' in result?'FILE SELECTED':'FILE SELECTION FAILED'} tone={'filename' in result?'success':'danger'} showCancel={false} confirmLabel="OK" onConfirm={close} onCancel={close} message={'filename' in result?<><span className="confirmation-dialog-message-line">Filename:</span><span className="confirmation-dialog-message-line">{result.filename}</span><span className="confirmation-dialog-message-line">File selection successful.</span></>:<><span className="confirmation-dialog-message-line">Reason:</span><span className="confirmation-dialog-message-line">{result.error}</span></>}/>}
 </section>
}
