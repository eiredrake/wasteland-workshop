import LoadingDialog from '../../components/LoadingDialog/LoadingDialog'
import {ocrService,scannerDiagnostics,configureScannerDiagnostics} from '../../services/scanner/ScannerRuntime'
import {scannerError} from '../../services/ocr/OcrTypes'
import ImagePicker from '../../components/ImagePicker/ImagePicker'
import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import './ScanPrintsView.css'
type SelectionResult={filename:string}|{error:string}
export default function ScanPrintsView(){
 const chooseButton=useRef<HTMLButtonElement>(null)
 const [result,setResult]=useState<SelectionResult>(),[loadDismissed,setLoadDismissed]=useState(false),[exportError,setExportError]=useState('')
 const state=useSyncExternalStore(listener=>ocrService.subscribe(()=>listener()),()=>ocrService.state,()=>ocrService.state)
 const [settings]=useState(configureScannerDiagnostics)
 useEffect(()=>{void ocrService.initialize().catch(()=>{/* Structured failure is displayed from the service state. */})},[])
 function retry(){setLoadDismissed(false);void ocrService.initialize().catch(()=>{/* Service retains the actual initialization error. */})}
 function selected(file:File){scannerDiagnostics.record({type:'FILE_SELECTED',stage:'acquisition',scanId:crypto.randomUUID(),status:'SUCCESS',text:file.name});setResult({filename:file.name})}
 function exportDiagnostics(){try{const url=URL.createObjectURL(new Blob([scannerDiagnostics.exportJson()],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='workshop-scan-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);setExportError('')}catch(error){setExportError(error instanceof Error?error.message:String(error))}}
 function failure(error:unknown){const message=error instanceof Error?error.message:String(error);scannerDiagnostics.record({type:'FILE_SELECTION_FAILED',stage:'acquisition',scanId:crypto.randomUUID(),status:'FAILED',error:scannerError('UNEXPECTED_ERROR','acquisition',message)});setResult({error:message})}
 function close(){setResult(undefined);requestAnimationFrame(()=>chooseButton.current?.focus())}
 return <section aria-label="Scan Prints"><h2>Scan Prints</h2>
 <div className="scan-prints-entry-actions">
 <ImagePicker buttonRef={chooseButton} onSelected={selected} onError={failure}/>
 </div>
 {(state==='NOT_LOADED'||state==='LOADING')&&<LoadingDialog title="Loading OCR Library" message="Preparing the scanner..."/>}
 {state==='FAILED'&&!loadDismissed&&<ConfirmationDialog title="OCR INITIALIZATION FAILED" tone="danger" message={ocrService.error?.message??'OCR initialization failed.'} confirmLabel="Retry" onConfirm={retry} onCancel={()=>setLoadDismissed(true)}/>}
 {settings.diagnostics&&<details><summary>Scan Diagnostics</summary><p>Provider: {ocrService.identity.id} · State: {state}. Mock initialization is available; OCR recognition is not implemented.</p><div className="scanner-diagnostic-actions"><button type="button" className="secondary-button" onClick={exportDiagnostics}>Export Scan Diagnostics</button><button type="button" className="secondary-button" onClick={()=>scannerDiagnostics.clear()}>Clear Scan Diagnostics</button></div>{exportError&&<p role="alert">{exportError}</p>}</details>}
 {result&&<ConfirmationDialog title={'filename' in result?'FILE SELECTED':'FILE SELECTION FAILED'} tone={'filename' in result?'success':'danger'} showCancel={false} confirmLabel="OK" onConfirm={close} onCancel={close} message={'filename' in result?<><span className="confirmation-dialog-message-line">Filename:</span><span className="confirmation-dialog-message-line">{result.filename}</span><span className="confirmation-dialog-message-line">File selection successful.</span></>:<><span className="confirmation-dialog-message-line">Reason:</span><span className="confirmation-dialog-message-line">{result.error}</span></>}/>}
 </section>
}
