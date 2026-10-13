import BackButton from '../../components/BackButton/BackButton'
import PrintClaimDialog from '../../components/PrintClaimDialog/PrintClaimDialog'
import { inspectScannerOffline, prepareScannerOffline, scannerOfflineStatus, subscribeScannerOffline } from './ScannerOffline'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import LoadingIndicator from '../../components/LoadingIndicator/LoadingIndicator'
import PhotoAdjuster from '../../components/PhotoAdjuster/PhotoAdjuster'
import type { Blueprint } from '../blueprints/Blueprint'
import { masterBlueprints } from '../blueprints/blueprints'
import type { ScanOutcome } from './ScanSession'
import { type ScanMatch } from './ScanMatching'
import { createScanRecognizer, type ScanRecognizer, type ScanPassDiagnostic } from './ScanRecognition'
import { adjustPhoto, decodePhoto, fullPhotoCrop, PHOTO_ACCEPT, recognizePhoto, titlePhotoCrop, type PhotoCrop } from './PhotoImage'

export default function PhotoImport({valid,onAcquire,onOutcome,onExit,onCamera,diagnostics}:{valid:boolean;onAcquire:(blueprint:Blueprint)=>{alreadyOwned:boolean};onOutcome:(outcome:ScanOutcome,newPhoto:boolean)=>void;onExit:()=>void;onCamera:()=>void;diagnostics:boolean}) {
 const claimed=useRef(false)
 const [claimOpen,setClaimOpen]=useState(false),[failureOpen,setFailureOpen]=useState(false)
 const offline=useSyncExternalStore(subscribeScannerOffline,scannerOfflineStatus,scannerOfflineStatus)
 useEffect(()=>{void inspectScannerOffline().catch(()=>{})},[])
 const analysisCanvas=useRef<HTMLCanvasElement|undefined>(undefined)
 const input=useRef<HTMLInputElement>(null),original=useRef<HTMLCanvasElement|undefined>(undefined),recognizer=useRef<ScanRecognizer|undefined>(undefined),generation=useRef(0),busy=useRef(false),counted=useRef(false)
 const [files,setFiles]=useState<File[]>([]),[index,setIndex]=useState(0),[preview,setPreview]=useState<string>(),[rotation,setRotation]=useState(0),[crop,setCrop]=useState<PhotoCrop>(fullPhotoCrop),[loading,setLoading]=useState(false),[analyzing,setAnalyzing]=useState(false),[error,setError]=useState(''),[match,setMatch]=useState<ScanMatch>(),[selected,setSelected]=useState<Blueprint>(),[outcome,setOutcome]=useState<ScanOutcome>(),[report,setReport]=useState<string>()
 function release(){generation.current++;if(analysisCanvas.current)analysisCanvas.current.width=analysisCanvas.current.height=0;analysisCanvas.current=undefined;if(original.current)original.current.width=original.current.height=0;original.current=undefined;const current=recognizer.current;recognizer.current=undefined;void current?.close();busy.current=false}
 useEffect(()=>()=>{generation.current++;if(analysisCanvas.current)analysisCanvas.current.width=analysisCanvas.current.height=0;if(original.current)original.current.width=original.current.height=0;void recognizer.current?.close()},[])
 function record(value:ScanOutcome){onOutcome(value,!counted.current);counted.current=true;setOutcome(value)}
 function clearResult(){claimed.current=false;setClaimOpen(false);setFailureOpen(false);setMatch(undefined);setSelected(undefined);setOutcome(undefined);setReport(undefined);setError('')}
 async function load(batch:File[],position:number){
  if(busy.current)return
  if(original.current)original.current.width=original.current.height=0;original.current=undefined
  const job=++generation.current;busy.current=true;counted.current=false;setFiles(batch);setIndex(position);setPreview(undefined);setRotation(0);setCrop(fullPhotoCrop);clearResult();setLoading(true)
  try{const canvas=await decodePhoto(batch[position]);if(job!==generation.current){canvas.width=canvas.height=0;return}original.current=canvas;setPreview(canvas.toDataURL('image/jpeg',.9))}
  catch(error){if(job===generation.current){setError(error instanceof Error?error.message:'Unable to read this photo.');if(diagnostics)setReport(JSON.stringify({inputMethod:'Photo',failure:'Image decoding failure',message:error instanceof Error?error.message:'Unable to read photo'},null,2));record('unmatched');setFailureOpen(true)}}
  finally{if(job===generation.current){busy.current=false;setLoading(false)}}
 }
 function adjust(angle:number,nextCrop:PhotoCrop){if(busy.current||!original.current||outcome==='acquired'||outcome==='owned')return;clearResult();let canvas:HTMLCanvasElement|undefined;try{canvas=adjustPhoto(original.current,angle);setPreview(canvas.toDataURL('image/jpeg',.9));setRotation(angle);setCrop(nextCrop)}catch(error){setError(error instanceof Error?error.message:'Unable to adjust the photo.')}finally{if(canvas)canvas.width=canvas.height=0}}
 async function analyze(){
  if(busy.current||!original.current||!valid||outcome==='acquired'||outcome==='owned')return
  busy.current=true;setAnalyzing(true);setError('');setMatch(undefined);setSelected(undefined);setReport(undefined)
  const job=generation.current,started=performance.now(),passes:ScanPassDiagnostic[]=[]
  let canvas:HTMLCanvasElement|undefined
  let failure='',recognitionResult:ScanMatch|undefined
  record('unmatched')
  try{
   canvas=adjustPhoto(original.current,rotation,crop);analysisCanvas.current=canvas
   if(!recognizer.current)recognizer.current=createScanRecognizer({onLoading:value=>{if(job===generation.current)setLoading(value)}})
   const result=await recognizePhoto(canvas,recognizer.current,masterBlueprints,JSON.stringify(crop)!==JSON.stringify(fullPhotoCrop),diagnostics?pass=>passes.push(pass):undefined)
   if(job!==generation.current)return
   recognitionResult=result;setMatch(result)
   if(result.confidence==='high'){setSelected(result.candidates[0].blueprint);setClaimOpen(true)}else setFailureOpen(true)
   failure=result.confidence==='ambiguous'?'Multiple ambiguous catalog matches':result.confidence==='none'?(result.readText?'Title found but no catalog match':passes.some(pass=>pass.mode!=='error'&&pass.text.trim())?'Text recognized but no title found':'No text recognized'):''
  }catch(error){failure=error instanceof Error?error.message:'Processing error';if(job===generation.current){setError('Recognition failed. Try again. '+failure);setFailureOpen(true);const current=recognizer.current;recognizer.current=undefined;void current?.close()}}
  finally{if(canvas)canvas.width=canvas.height=0;if(analysisCanvas.current===canvas)analysisCanvas.current=undefined;if(job===generation.current){busy.current=false;setAnalyzing(false);setLoading(false);if(diagnostics)setReport(JSON.stringify({inputMethod:'Photo',width:original.current?.width,height:original.current?.height,rotation,crop,milliseconds:Math.round(performance.now()-started),failure,confidence:recognitionResult?.confidence,extractedText:recognitionResult?.readText,candidates:recognitionResult?.candidates.map(candidate=>({id:candidate.blueprint.id,name:candidate.blueprint.name,score:candidate.score})),passes:passes.map(pass=>Object.fromEntries(Object.entries(pass).filter(([key])=>key!=='image')))},null,2))}}
 }
 function acquire(){if(busy.current||claimed.current||!valid||!selected||outcome==='acquired'||outcome==='owned')return;busy.current=true;try{const result=onAcquire(selected);claimed.current=true;record(result.alreadyOwned?'owned':'acquired');setError('');setClaimOpen(false)}catch(error){setError(error instanceof Error?error.message:'Unable to save. Nothing was acquired.')}finally{busy.current=false}}
 function cancel(){release();setPreview(undefined);setFiles([]);setLoading(false);setAnalyzing(false);clearResult()}
 function choose(){if(!busy.current)input.current?.click()}
 const locked=analyzing||loading||outcome==='acquired'||outcome==='owned'
 return <section aria-label="Photo import">
 <input ref={input} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={event=>{const batch=Array.from(event.target.files??[]);event.target.value='';if(batch.length)void load(batch,0)}}/>
 <div className="scanner-controls"><button type="button" className="primary-button" disabled={loading||analyzing||!valid} onClick={choose}>{files.length?'Choose Different Photo':'Choose Photo'}</button><button type="button" className="primary-button" onClick={()=>{release();onCamera()}}>Use Camera</button><BackButton onClick={()=>{release();onExit()}}>Back to Collections</BackButton></div>
 {import.meta.env.PROD&&(offline==='online-only'||offline==='unavailable')&&<details><summary>Offline Use</summary><p>Prepare while online before your event. Both OCR engines use about 150 MB of device storage. Your photographs are never cached.</p><button type="button" className="secondary-button" onClick={()=>void prepareScannerOffline()}>Prepare Offline Scanning</button></details>}
 {offline==='preparing'&&<p role="status">Preparing offline scanning… Keep the app online until this finishes.</p>}
 {offline==='ready'&&<p>Scanner assets ready for offline use.</p>}
 {offline==='unavailable'&&<p>Offline assets could not be saved. Scanning remains available while online.</p>}
 {files.length>0&&<p className="photo-import-file">Photo {index+1} of {files.length}: {files[index].name}</p>}
 {error&&<p role="alert">{error}</p>}
 {loading?<LoadingIndicator label={analyzing?'Loading OCR Library':'Loading Photo'}/>:analyzing&&<LoadingIndicator label="Analyzing Photo"/>}
 {preview&&<>
 <PhotoAdjuster photo={preview} crop={crop} disabled={locked} onChange={value=>{clearResult();setCrop(value)}}/>
 <details><summary>Adjust Crop and Rotation</summary><p>Drag a rectangle around the complete Item Name row, or adjust the crop below. Rotation and crop affect recognition.</p>
 <div className="scanner-controls"><button type="button" className="secondary-button" disabled={locked} onClick={()=>adjust((rotation+270)%360,fullPhotoCrop)}>Rotate Left 90°</button><button type="button" className="secondary-button" disabled={locked} onClick={()=>adjust((rotation+90)%360,fullPhotoCrop)}>Rotate Right 90°</button><button type="button" className="secondary-button" disabled={locked} onClick={()=>adjust(rotation,titlePhotoCrop)}>Crop Title Region</button><button type="button" className="secondary-button" disabled={locked} onClick={()=>adjust(0,fullPhotoCrop)}>Reset Adjustments</button></div>
 <div className="photo-crop-fields">{(['x','y','width','height'] as const).map(key=><label key={key}>{({x:'Left',y:'Top',width:'Width',height:'Height'})[key]} (%)<input type="number" min={key==='width'||key==='height'?1:0} max="100" disabled={locked} value={Math.round(crop[key]*100)} onChange={event=>{const n=Number(event.target.value)/100,next={...crop,[key]:n};next.x=Math.max(0,Math.min(next.x,.99));next.y=Math.max(0,Math.min(next.y,.99));next.width=Math.max(.01,Math.min(next.width,1-next.x));next.height=Math.max(.01,Math.min(next.height,1-next.y));clearResult();setCrop(next)}}/></label>)}</div></details>
 <div className="scanner-controls"><button type="button" className="primary-button" disabled={locked||!valid} onClick={()=>void analyze()}>{match?'Try Again':'Analyze Photo'}</button><button type="button" className="secondary-button" onClick={cancel}>Cancel</button></div>
 </>}
 {claimOpen&&selected&&<PrintClaimDialog name={selected.name} error={error} disabled={locked||!valid} onCancel={()=>{release();onExit()}} onClaim={acquire}/>}
 {failureOpen&&<PrintClaimDialog error={error} onCancel={()=>{release();onExit()}} onRetry={()=>{setFailureOpen(false);setError('');setMatch(undefined)}}/>}
 {selected&&<p>{selected.name}</p>}
 {outcome==='acquired'||outcome==='owned'?<p className="scanner-success">{outcome==='owned'?'Already Acquired':'Acquired and saved.'}</p>:selected&&<button type="button" className="primary-button" disabled={locked||!valid} onClick={()=>setClaimOpen(true)}>Review Identified Print</button>}
 {files.length>0&&<div className="scanner-controls"><button type="button" className="primary-button" disabled={analyzing||loading} onClick={()=>{if(index+1<files.length)void load(files,index+1);else choose()}}>{index+1<files.length?'Next Photo':'Choose Next Photo'}</button></div>}
 {diagnostics&&report&&<details><summary>Photo Diagnostics</summary><pre className="scanner-read-text">{report}</pre></details>}
 </section>
}
