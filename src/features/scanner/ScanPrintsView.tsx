import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react'
import LoadingDialog from '../../components/LoadingDialog/LoadingDialog'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import BackButton from '../../components/BackButton/BackButton'
import ImagePicker from '../../components/ImagePicker/ImagePicker'
import {ocrService,blueprintMatcher,scannerDiagnostics,configureScannerDiagnostics} from '../../services/scanner/ScannerRuntime'
import {scannerError,validateScanRequest,type ScannerError,type TargetRegion} from '../../services/ocr/OcrTypes'
import {prepareStaticImage,staticImageRequest,type PreparedImage} from '../../services/scanner/StaticImageInput'
import {CameraSession} from '../../services/scanner/CameraAcquisition'
import type {DiagnosticInput} from '../../services/scanner/Diagnostics'
import CameraAcquisitionView from './CameraAcquisitionView'
import StaticImageReview,{type ReviewTransformation} from './StaticImageReview'
import './ScanPrintsView.css'
type DialogResult={title:string;success:boolean;message:string}
export default function ScanPrintsView({onToCollections}:{onToCollections:()=>void}){
 const chooseButton=useRef<HTMLButtonElement>(null),cameraButton=useRef<HTMLButtonElement>(null),confirmButton=useRef<HTMLButtonElement>(null),generation=useRef(0),busy=useRef(false),mounted=useRef(true)
 const [session]=useState(()=>new CameraSession()),[result,setResult]=useState<DialogResult>(),[image,setImage]=useState<PreparedImage>(),[cameraOpen,setCameraOpen]=useState(false),[decoding,setDecoding]=useState(false),[scanning,setScanning]=useState(false),[loadDismissed,setLoadDismissed]=useState(false),[exportError,setExportError]=useState('')
 const [settings]=useState(configureScannerDiagnostics)
 const state=useSyncExternalStore(listener=>ocrService.subscribe(()=>listener()),()=>ocrService.state,()=>ocrService.state)
 const record=useCallback((event:DiagnosticInput)=>scannerDiagnostics.record(event),[])
 const showFailure=useCallback((error:ScannerError)=>{const title=error.stage==='camera'||error.stage==='capture'?'CAMERA ERROR':error.stage==='matching'?'PRINT IDENTIFICATION FAILED':error.stage==='image'||error.stage==='target'?'IMAGE ERROR':'OCR FAILED';setResult({title,success:false,message:'Reason: '+error.message})},[])
 const cameraFailure=useCallback((error:ScannerError)=>{session.stop();setCameraOpen(false);showFailure(error)},[session,showFailure])
 useEffect(()=>{mounted.current=true;void ocrService.initialize().catch(()=>{});return()=>{mounted.current=false;session.stop()}},[session])
 function retry(){setLoadDismissed(false);void ocrService.initialize().catch(()=>{})}
 async function acquire(file:File,sourceType:PreparedImage['sourceType'],acquisitionId:string,initialTarget?:TargetRegion){
  const selected=++generation.current
  setImage(undefined);setDecoding(true)
  record({type:sourceType==='FILE'?'FILE_SELECTED':'STATIC_CAPTURE_RECEIVED',stage:'acquisition',scanId:acquisitionId,acquisitionId,sourceType,status:'SUCCESS',filename:file.name,fileSize:file.size,mimeType:file.type})
  const prepared=await prepareStaticImage(file,sourceType,acquisitionId,initialTarget,record)
  if(!mounted.current||selected!==generation.current){record({type:'IMAGE_ACQUISITION_ABANDONED',stage:'image',scanId:acquisitionId,acquisitionId,sourceType,status:'ABANDONED'});return}
  setDecoding(false)
  record({type:'IMAGE_DECODE_RESULT',stage:'image',scanId:acquisitionId,acquisitionId,sourceType,filename:file.name,status:prepared.ok?'SUCCESS':'FAILED',width:prepared.ok?prepared.value.width:undefined,height:prepared.ok?prepared.value.height:undefined,error:prepared.ok?undefined:prepared.error})
  if(prepared.ok)setImage(prepared.value)
  else showFailure(prepared.error)
 }
 function selected(file:File){if(busy.current)return;setResult(undefined);void acquire(file,'FILE',crypto.randomUUID())}
 function beforePicker(){session.stop();setCameraOpen(false)}
 function openCamera(){if(busy.current)return;generation.current++;setDecoding(false);setResult(undefined);setCameraOpen(true)}
 function captured(file:File,target:TargetRegion,acquisitionId:string){setCameraOpen(false);setResult(undefined);void acquire(file,'CAMERA_CAPTURE',acquisitionId,target)}
 async function confirm(target:TargetRegion,transform:ReviewTransformation){
  if(!image||busy.current||state!=='READY')return
  const scanId=crypto.randomUUID(),started=performance.now(),request=staticImageRequest(image,target,scanId),invalid=validateScanRequest(request)
  if(invalid){showFailure(invalid);return}
  busy.current=true;setScanning(true);setResult(undefined)
  record({type:'SCAN_STARTED',stage:'target',scanId,acquisitionId:image.acquisitionId,sourceType:image.sourceType,filename:image.file.name,fileSize:image.file.size,mimeType:image.file.type,width:image.width,height:image.height,target:request.target,transformation:transform,providerId:ocrService.identity.id,providerVersion:ocrService.identity.version,initializationState:state,initializationDurationMs:ocrService.initializationDurationMs})
  let error:ScannerError|undefined
  try{
   const recognized=await ocrService.scanImage(request)
   if(!recognized.ok){error=recognized.error;if(mounted.current)showFailure(error);return}
   const matched=await blueprintMatcher.match(recognized.value.text,scanId)
   if(!matched.ok){error=matched.error;if(mounted.current)showFailure(error);return}
   if(mounted.current)setResult({title:'PRINT IDENTIFIED',success:true,message:'Blueprint: '+matched.value.name+'\nOCR Engine: '+recognized.value.providerId})
  }catch(cause){error=scannerError('UNEXPECTED_ERROR','recognition',cause instanceof Error?cause.message:String(cause));if(mounted.current)showFailure(error)}
  finally{record({type:'SCAN_COMPLETED',stage:error?.stage??'matching',scanId,acquisitionId:image.acquisitionId,sourceType:image.sourceType,status:error?'FAILED':'SUCCESS',error,durationMs:performance.now()-started});busy.current=false;if(mounted.current)setScanning(false)}
 }
 function failure(error:unknown){const detail=scannerError('UNEXPECTED_ERROR','acquisition',error instanceof Error?error.message:String(error));record({type:'FILE_SELECTION_FAILED',stage:'acquisition',scanId:crypto.randomUUID(),sourceType:'FILE',status:'FAILED',error:detail});setResult({title:'FILE SELECTION FAILED',success:false,message:'Reason: '+detail.message})}
 function close(){
  setResult(undefined);requestAnimationFrame(()=>(image?confirmButton.current:cameraButton.current??chooseButton.current)?.focus())
 }
 function exportDiagnostics(){try{const url=URL.createObjectURL(new Blob([scannerDiagnostics.exportJson()],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='workshop-scan-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);setExportError('')}catch(error){setExportError(error instanceof Error?error.message:String(error))}}
 return <section aria-label="Scan Prints">
 <BackButton onClick={()=>{session.stop();onToCollections()}}>To Collections</BackButton>
 <h2>Scan Prints</h2>
 <div className="scan-prints-entry-actions"><ImagePicker buttonRef={chooseButton} onBeforeOpen={beforePicker} onSelected={selected} onError={failure}/><button ref={cameraButton} type="button" className="primary-button primary-button-cream" disabled={scanning||cameraOpen} onClick={openCamera}>Scan Image</button></div>
 {image&&!cameraOpen&&<p className="scan-selected-filename">Filename: {image.file.name}</p>}
 {cameraOpen&&<CameraAcquisitionView session={session} record={record} onError={cameraFailure} onCancel={()=>setCameraOpen(false)} onCaptured={captured}/>}
 {image&&!cameraOpen&&<StaticImageReview record={record} onError={showFailure} key={image.acquisitionId} image={image} disabled={scanning} canConfirm={state==='READY'} onConfirm={(target,transform)=>{void confirm(target,transform)}} onReplace={()=>image.sourceType==='CAMERA_CAPTURE'?openCamera():chooseButton.current?.click()} confirmRef={confirmButton}/>}
 {(state==='NOT_LOADED'||state==='LOADING')&&<LoadingDialog title="Loading OCR Library" message="Preparing the scanner..."/>}
 {state==='FAILED'&&!loadDismissed&&<ConfirmationDialog title="OCR INITIALIZATION FAILED" tone="danger" message={ocrService.error?.message??'OCR initialization failed.'} confirmLabel="Retry" onConfirm={retry} onCancel={()=>setLoadDismissed(true)}/>}
 {state==='FAILED'&&loadDismissed&&<button type="button" className="secondary-button" onClick={retry}>Retry OCR Loading</button>}
 {decoding&&!result&&state!=='LOADING'&&<LoadingDialog title="Preparing Image" message="Decoding the static image..."/>}
 {scanning&&<LoadingDialog title="Scanning Image" message="Recognizing blueprint text..."/>}
 {settings.diagnostics&&<details><summary>Scan Diagnostics</summary><p>Provider: {ocrService.identity.id} · State: {state}. Both acquisition methods use static images. Image attachments are not yet included in exports.</p><div className="scanner-diagnostic-actions"><button type="button" className="secondary-button" onClick={exportDiagnostics}>Export Scan Diagnostics</button><button type="button" className="secondary-button" onClick={()=>scannerDiagnostics.clear()}>Clear Scan Diagnostics</button></div>{exportError&&<p role="alert">{exportError}</p>}</details>}
 {result&&!scanning&&state!=='LOADING'&&state!=='NOT_LOADED'&&<ConfirmationDialog title={result.title} tone={result.success?'success':'danger'} showCancel={false} confirmLabel="OK" onConfirm={close} onCancel={close} message={<>{result.message.split('\n').map((line,index)=><span key={index} className="confirmation-dialog-message-line">{line}</span>)}</>}/>}
 </section>
}
