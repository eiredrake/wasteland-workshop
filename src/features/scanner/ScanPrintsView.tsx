import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react'
import LoadingDialog from '../../components/LoadingDialog/LoadingDialog'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import BackButton from '../../components/BackButton/BackButton'
import ImagePicker from '../../components/ImagePicker/ImagePicker'
import {ocrService,blueprintMatcher,scannerDiagnostics,configureScannerDiagnostics} from '../../services/scanner/ScannerRuntime'
import {scannerError,validateScanRequest,type ScannerError,type TargetRegion} from '../../services/ocr/OcrTypes'
import {prepareStaticImage,staticImageRequest,type PreparedImage} from '../../services/scanner/StaticImageInput'
import type {BlueprintCollection} from '../blueprints/BlueprintCollection'
import type {CatalogEntry} from '../../services/scanner/BlueprintMatcher'
import type {DiagnosticInput} from '../../services/scanner/Diagnostics'
import StaticImageReview,{type ReviewTransformation} from './StaticImageReview'
import OcrInputPreview from './OcrInputPreview'
import ManualPrintDialog from './ManualPrintDialog'
import {masterBlueprints} from '../blueprints/blueprints'
import './ScanPrintsView.css'
type DialogResult={title:string;success:boolean;message:string;matches?:CatalogEntry[];manual?:boolean;scanId?:string}
export default function ScanPrintsView({activeCollection,onToCollections,onAcquire}:{activeCollection:BlueprintCollection;onToCollections:()=>void;onAcquire:(blueprint:CatalogEntry)=>boolean}){
 const chooseButton=useRef<HTMLButtonElement>(null),cameraButton=useRef<HTMLButtonElement>(null),confirmButton=useRef<HTMLButtonElement>(null),generation=useRef(0),busy=useRef(false),mounted=useRef(true)
 const [result,setResult]=useState<DialogResult>(),[image,setImage]=useState<PreparedImage>(),[decoding,setDecoding]=useState(false),[scanning,setScanning]=useState(false),[loadDismissed,setLoadDismissed]=useState(false),[exportError,setExportError]=useState(''),[copyStatus,setCopyStatus]=useState('')
 const [settings]=useState(configureScannerDiagnostics)
 const crop=useSyncExternalStore(scannerDiagnostics.subscribeCrop,scannerDiagnostics.getCrop,scannerDiagnostics.getCrop)
 const state=useSyncExternalStore(listener=>ocrService.subscribe(()=>listener()),()=>ocrService.state,()=>ocrService.state)
 const record=useCallback((event:DiagnosticInput)=>scannerDiagnostics.record(event),[])
 const showFailure=useCallback((error:ScannerError)=>{const title=error.stage==='camera'||error.stage==='capture'?'CAMERA ERROR':error.stage==='matching'?'PRINT IDENTIFICATION FAILED':error.stage==='image'||error.stage==='target'?'IMAGE ERROR':'OCR FAILED';setResult({title,success:false,message:'Reason: '+error.message})},[])
 useEffect(()=>{mounted.current=true;void ocrService.initialize().catch(()=>{});return()=>{mounted.current=false}},[])
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
 function selected(file:File,sourceType:PreparedImage['sourceType']='FILE'){
  if(busy.current)return
  const acquisitionId=crypto.randomUUID()
  record({type:'FILE_PICKER_SELECTED',stage:'acquisition',scanId:acquisitionId,acquisitionId,sourceType,operation:sourceType==='FILE'?'choose-image-unrestricted':'capture-image-native',api:'HTMLInputElement.files',filename:file.name,fileSize:file.size,mimeType:file.type,status:'SUCCESS'})
  setResult(undefined);return acquire(file,sourceType,acquisitionId)
 }
 async function confirm(target:TargetRegion,transform:ReviewTransformation){
  if(!image||busy.current||state!=='READY')return
  const scanId=crypto.randomUUID(),started=performance.now(),request=staticImageRequest(image,target,scanId),invalid=validateScanRequest(request)
  if(invalid){showFailure(invalid);return}
  scannerDiagnostics.clearCrop();busy.current=true;setScanning(true);setResult(undefined)
  record({type:'SCAN_STARTED',stage:'target',scanId,acquisitionId:image.acquisitionId,sourceType:image.sourceType,filename:image.file.name,fileSize:image.file.size,mimeType:image.file.type,width:image.width,height:image.height,target:request.target,transformation:transform,providerId:ocrService.identity.id,providerVersion:ocrService.identity.version,initializationState:state,initializationDurationMs:ocrService.initializationDurationMs})
  let error:ScannerError|undefined
  try{
   const recognized=await ocrService.scanImage(request)
   if(!recognized.ok){error=recognized.error;if(mounted.current)showFailure(error);return}
   const matched=await blueprintMatcher.match(recognized.value.text,scanId)
   if(!matched.ok){error=matched.error;if(mounted.current){if(matched.candidates)setResult({title:'PRINT MATCHES',success:true,message:matched.candidates.length+' matches found. Select a blueprint to acquire:',matches:matched.candidates,scanId});else if(error.code==='NO_MATCH'||error.code==='AMBIGUOUS_MATCH')setResult({title:'SELECT PRINT',success:false,message:error.code==='NO_MATCH'?'The print was not identified. Type its name or select a blueprint below.':'More than three prints matched. Type the name or select the correct blueprint below.',manual:true,scanId});else showFailure(error)};return}
   if(mounted.current)setResult({title:'PRINT MATCHES',success:true,message:'1 match found. Select a blueprint to acquire:',matches:[matched.value],scanId})
  }catch(cause){error=scannerError('UNEXPECTED_ERROR','recognition',cause instanceof Error?cause.message:String(cause));if(mounted.current)showFailure(error)}
  finally{record({type:'SCAN_COMPLETED',stage:error?.stage??'matching',scanId,acquisitionId:image.acquisitionId,sourceType:image.sourceType,status:error?'FAILED':'SUCCESS',error,durationMs:performance.now()-started});busy.current=false;if(mounted.current)setScanning(false)}
 }
 function alreadyOwned(id:number){return activeCollection.entries.some(entry=>entry.blueprintId===id&&(entry.status==='acquired'||entry.status==='sell'))}
 function acquireMatch(blueprint:CatalogEntry){
  if(alreadyOwned(blueprint.id))return
  if(!result||(result.manual?!masterBlueprints.some(item=>item.id===blueprint.id):!result.matches?.some(item=>item.id===blueprint.id)))return
  const ok=onAcquire(blueprint)
  record({type:'BLUEPRINT_ACQUISITION_RESULT',stage:'matching',scanId:result.scanId,blueprintId:blueprint.id,status:ok?'SUCCESS':'FAILED'})
  if(ok)close()
  else setResult({...result,success:false,message:'Could not save the acquired blueprint. Please try again.\nBlueprint: '+blueprint.name})
 }
 function failure(error:unknown){const detail=scannerError('UNEXPECTED_ERROR','acquisition',error instanceof Error?error.message:String(error));record({type:'FILE_SELECTION_FAILED',stage:'acquisition',scanId:crypto.randomUUID(),sourceType:'FILE',status:'FAILED',error:detail});setResult({title:'FILE SELECTION FAILED',success:false,message:'Reason: '+detail.message})}
 function close(){
  const finishedPrint=!!(result?.matches||result?.manual)
  if(finishedPrint){generation.current++;setImage(undefined)}
  setResult(undefined);requestAnimationFrame(()=>(finishedPrint?chooseButton.current:image?confirmButton.current:cameraButton.current??chooseButton.current)?.focus())
 }
 async function copyDiagnostics(){
  setCopyStatus('');setExportError('')
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard access is unavailable. Use Export Scan Diagnostics instead.')
   await navigator.clipboard.writeText(scannerDiagnostics.exportJson())
   setCopyStatus('Diagnostics copied to clipboard.')
  }catch(error){setExportError('Could not copy diagnostics. '+(error instanceof Error?error.message:String(error)))}
 }
 function exportDiagnostics(){try{const url=URL.createObjectURL(new Blob([scannerDiagnostics.exportJson()],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='workshop-scan-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);setExportError('')}catch(error){setExportError(error instanceof Error?error.message:String(error))}}
 return <section aria-label="Scan Prints">
 <BackButton onClick={onToCollections}>To Collections</BackButton>
 <h2>Scan Prints</h2>
 <p className="scan-selected-filename">Active collection: {activeCollection.name}</p>
 <div className="scan-prints-entry-actions"><ImagePicker buttonRef={chooseButton} disabled={scanning||decoding} onSelected={file=>selected(file)} onError={failure}/><ImagePicker camera buttonRef={cameraButton} disabled={scanning||decoding} onSelected={file=>selected(file,'CAMERA_CAPTURE')} onError={failure}/></div>
 {image&&<p className="scan-selected-filename">Filename: {image.file.name}</p>}
 {image&&<StaticImageReview record={record} onError={showFailure} key={image.acquisitionId} image={image} disabled={scanning} canConfirm={state==='READY'} onConfirm={(target,transform)=>{void confirm(target,transform)}} onReplace={()=>image.sourceType==='CAMERA_CAPTURE'?cameraButton.current?.click():chooseButton.current?.click()} confirmRef={confirmButton}/>}
 {(state==='NOT_LOADED'||state==='LOADING')&&<LoadingDialog title="Loading OCR Library" message="Preparing the scanner..."/>}
 {state==='FAILED'&&!loadDismissed&&<ConfirmationDialog title="OCR INITIALIZATION FAILED" tone="danger" message={ocrService.error?.message??'OCR initialization failed.'} confirmLabel="Retry" onConfirm={retry} onCancel={()=>setLoadDismissed(true)}/>}
 {state==='FAILED'&&loadDismissed&&<button type="button" className="secondary-button" onClick={retry}>Retry OCR Loading</button>}
 {decoding&&!result&&state!=='LOADING'&&<LoadingDialog title="Preparing Image" message="Decoding the static image..."/>}
 {scanning&&<LoadingDialog title="Scanning Image" message="Recognizing blueprint text..."/>}
 {settings.diagnostics&&<details><summary>Scan Diagnostics</summary><p>Provider: {ocrService.identity.id} / State: {state}. Both acquisition methods use static images. With image diagnostics enabled, the latest exact OCR crop is shown below and can be saved separately. JSON reports contain event data only.</p><div className="scanner-diagnostic-actions"><button type="button" className="secondary-button" onClick={()=>{void copyDiagnostics()}}>Copy Scan Diagnostics</button><button type="button" className="secondary-button" onClick={exportDiagnostics}>Export Scan Diagnostics</button><button type="button" className="secondary-button" onClick={()=>scannerDiagnostics.clear()}>Clear Scan Diagnostics</button></div>{crop&&<OcrInputPreview crop={crop}/>} {copyStatus&&<p role="status">{copyStatus}</p>}{exportError&&<p role="alert">{exportError}</p>}</details>}
 {result?.manual&&!scanning&&<ManualPrintDialog message={result.message} collectionName={activeCollection.name} alreadyOwned={alreadyOwned} onAcquire={acquireMatch} onCancel={close}/>}
 {result&&!result.manual&&!scanning&&state!=='LOADING'&&state!=='NOT_LOADED'&&<ConfirmationDialog title={result.title} tone={result.success?'success':'danger'} showCancel={false} confirmLabel={result.matches?(result.matches.every(item=>alreadyOwned(item.id))?'Done':'Cancel'):'OK'} onConfirm={close} onCancel={close} message={<>{result.matches&&<span className="confirmation-dialog-message-line">Active collection: {activeCollection.name}</span>}{result.message.replace(' Select a blueprint to acquire:','').split('\n').map((line,index)=><span key={index} className="confirmation-dialog-message-line">{line}</span>)}{result.matches&&<span className="scanner-match-candidates">{result.matches.map(item=>alreadyOwned(item.id)?<span key={item.id} role="status">{item.name} is already in the active collection "{activeCollection.name}".</span>:<button type="button" className="primary-button" key={item.id} onClick={()=>acquireMatch(item)}>Acquire {item.name}</button>)}</span>}</>}/>}
 </section>
}
