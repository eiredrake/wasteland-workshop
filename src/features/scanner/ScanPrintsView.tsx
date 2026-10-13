import ImagePicker from '../../components/ImagePicker/ImagePicker'
import {useRef,useState} from 'react'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import './ScanPrintsView.css'
type SelectionResult={filename:string}|{error:string}
export default function ScanPrintsView(){
 const chooseButton=useRef<HTMLButtonElement>(null)
 const [result,setResult]=useState<SelectionResult>()
 function failure(error:unknown){setResult({error:error instanceof Error?error.message:String(error)})}
 function close(){setResult(undefined);requestAnimationFrame(()=>chooseButton.current?.focus())}
 return <section aria-label="Scan Prints"><h2>Scan Prints</h2>
 <div className="scan-prints-entry-actions">
 <ImagePicker buttonRef={chooseButton} onSelected={file=>setResult({filename:file.name})} onError={failure}/>
 </div>
 {result&&<ConfirmationDialog title={'filename' in result?'FILE SELECTED':'FILE SELECTION FAILED'} tone={'filename' in result?'success':'danger'} showCancel={false} confirmLabel="OK" onConfirm={close} onCancel={close} message={'filename' in result?<><span className="confirmation-dialog-message-line">Filename:</span><span className="confirmation-dialog-message-line">{result.filename}</span><span className="confirmation-dialog-message-line">File selection successful.</span></>:<><span className="confirmation-dialog-message-line">Reason:</span><span className="confirmation-dialog-message-line">{result.error}</span></>}/>}
 </section>
}
