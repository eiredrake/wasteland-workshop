import { useEffect, useRef, useState, useEffectEvent } from 'react'
import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import CameraPreview from '../../components/CameraPreview/CameraPreview'
import type { Blueprint } from '../blueprints/Blueprint'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
import { masterBlueprints } from '../blueprints/blueprints'
import type { ScanMatch } from './ScanMatching'
import {matchPaddleLines} from './ScanRecognition'
import {advanceAutoCapture,type AutoCaptureStability} from './ScanAutoCapture'
import { createScanRecognizer, type ScanRecognizer, type ScanPassDiagnostic } from './ScanRecognition'
import { scanCounters, type ScanOutcome } from './ScanSession'
import { captureNamePhoto, stillCamera, type StillCamera } from './ScanCapture'
import { captureSharpness } from './ScanQuality'
import {requestFocus,type FocusReport} from './ScanFocus'
import {loadScannerDiagnostics} from '../settings/ScannerSettings'
import LoadingIndicator from '../../components/LoadingIndicator/LoadingIndicator'
import './BlueprintScanner.css'
type Props={collection:BlueprintCollection|undefined;destinationName:string;destinationId:string;activeId:string|undefined;onAcquire:(collectionId:string,blueprint:Blueprint)=>{alreadyOwned:boolean};onDone:()=>void}
export default function BlueprintScanner({collection,destinationName,destinationId,activeId,onAcquire,onDone}:Props){
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|undefined>(undefined),recognizer=useRef<ScanRecognizer|undefined>(undefined),generation=useRef(0),busy=useRef(false)
 const [camera,setCamera]=useState<'opening'|'ready'|'stopped'>('opening'),[error,setError]=useState(''),[analyzing,setAnalyzing]=useState(false),[photo,setPhoto]=useState<string>(),[match,setMatch]=useState<ScanMatch>(),[selected,setSelected]=useState<Blueprint>(),[summary,setSummary]=useState(false),[documents,setDocuments]=useState<ScanOutcome[]>([]),[outcome,setOutcome]=useState<ScanOutcome>(),[attempt,setAttempt]=useState(0)
 const photoCamera=useRef<StillCamera|undefined>(undefined)
 const [flashSupported,setFlashSupported]=useState(false),[flashOn,setFlashOn]=useState(false),[blurred,setBlurred]=useState(false)
 const [diagnosticsEnabled,setDiagnosticsEnabled]=useState(false),[diagnosticReport,setDiagnosticReport]=useState<string>()
 const [showDiagnostics]=useState(loadScannerDiagnostics)
 const [ocrLoading,setOcrLoading]=useState(false),[textBoxes,setTextBoxes]=useState<number[][][]>([])
 const [autoCapture,setAutoCapture]=useState(true)
 const previewRead=useRef<Promise<unknown>|undefined>(undefined)
 const focusReport=useRef<FocusReport|undefined>(undefined)
 const [focusSupported,setFocusSupported]=useState(false),[focusing,setFocusing]=useState(false),[focusMessage,setFocusMessage]=useState('')
 const captureCanvas=useRef<HTMLCanvasElement|undefined>(undefined)
 const currentOutcome=useRef<ScanOutcome|undefined>(undefined)
 const documentIndex=useRef<number|undefined>(undefined)
 const destinationValid=!!collection&&activeId===destinationId
 function invalidate(){generation.current++;if(captureCanvas.current)captureCanvas.current.width=captureCanvas.current.height=0;captureCanvas.current=undefined}
 function releaseCamera(){photoCamera.current=undefined;stream.current?.getTracks().forEach(track=>track.stop());stream.current=undefined;if(video.current)video.current.srcObject=null}
 function getRecognizer(){
  if(!recognizer.current){const current=createScanRecognizer({onLoading:loading=>{if(recognizer.current===current)setOcrLoading(loading)},onText:(boxes,width,height)=>{if(recognizer.current===current&&captureCanvas.current&&busy.current)setTextBoxes(boxes.filter(line=>line.score>=.55).slice(0,40).map(line=>line.poly.map(([x,y])=>[x/width,y/height])))}});recognizer.current=current}
  return recognizer.current
 }
 function closeRecognition(){previewRead.current=undefined;setOcrLoading(false);setTextBoxes([]);const current=recognizer.current;recognizer.current=undefined;void current?.close()}
 useEffect(()=>{
  let disposed=false
  const openingGeneration=generation.current
  async function open(){
   try{
    if(!window.isSecureContext)throw new Error('Camera scanning requires HTTPS (or localhost). Open the secure site on your phone.')
    if(typeof Worker==='undefined'||typeof WebAssembly==='undefined')throw new Error('This browser does not support the local recognition engine. Use a supported browser or search manually.')
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not support camera scanning. Use a supported browser or search Blueprints manually.')
    const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}},audio:false})
    if(disposed||generation.current!==openingGeneration){media.getTracks().forEach(track=>track.stop());return}
    stream.current=media
    setFlashSupported(false);setFlashOn(false)
    photoCamera.current=stillCamera(media.getVideoTracks()[0])
    try{const capabilities=await photoCamera.current?.getPhotoCapabilities();if(!disposed&&generation.current===openingGeneration)setFlashSupported(capabilities?.fillLightMode?.includes('flash')??false)}catch{/* Still capture may work without flash capability reporting. */}
    const focus=await requestFocus(media.getVideoTracks()[0])
    if(disposed||generation.current!==openingGeneration){media.getTracks().forEach(track=>track.stop());return}
    focusReport.current=focus;setFocusSupported(focus.supportedModes.some(mode=>mode==='continuous'||mode==='single-shot'));setFocusMessage('')
    if(disposed||generation.current!==openingGeneration){media.getTracks().forEach(track=>track.stop());return}
    for(const track of media.getVideoTracks())track.addEventListener('ended',()=>{if(!disposed){setCamera('stopped');setError('The camera was interrupted. Resume Camera to continue.')}})
    if(video.current){video.current.srcObject=media;await video.current.play()}
   }catch(e){if(!disposed){setCamera('stopped');const name=e instanceof Error?e.name:'';setError(name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings, then Resume Camera.':name==='NotReadableError'?'The camera is busy or unavailable. Close other camera apps and try again.':e instanceof Error?e.message:'Unable to open the camera.')}}
  }
  function hidden(){if(document.visibilityState==='hidden'){invalidate();releaseCamera();closeRecognition();busy.current=false;setAnalyzing(false);setCamera('stopped');setError('Camera paused while the app was in the background. Resume Camera when you return.')}}
  void open();document.addEventListener('visibilitychange',hidden)
  return()=>{disposed=true;invalidate();releaseCamera();closeRecognition();document.removeEventListener('visibilitychange',hidden)}
 },[attempt])
 function classify(index:number,value:ScanOutcome){currentOutcome.current=value;setDocuments(old=>old.map((item,i)=>i===index?value:item));setOutcome(value)}
 function choose(blueprint:Blueprint){setSelected(blueprint);if(collection?.entries.some(e=>e.blueprintId===blueprint.id&&e.status==='acquired')&&documentIndex.current!==undefined)classify(documentIndex.current,'owned')}
 async function refocus(){
  const track=stream.current?.getVideoTracks()[0]
  if(!track||busy.current||focusing)return
  const job=generation.current;setFocusing(true);setFocusMessage('Requesting autofocus…')
  try{
   const report=await requestFocus(track,true)
   if(job!==generation.current||stream.current?.getVideoTracks()[0]!==track)return
   focusReport.current=report
   setFocusMessage(report.result==='applied'?'Autofocus requested. Check that the name is sharp before capturing.':report.result==='failed'?'The camera rejected the autofocus request.':'This camera does not expose autofocus controls.')
  }finally{setFocusing(false)}
 }
 async function capture(){
  if(busy.current||focusing||ocrLoading||camera!=='ready'||!destinationValid||!video.current)return
  busy.current=true;currentOutcome.current=undefined;setAnalyzing(true);setError('');setMatch(undefined);setSelected(undefined);setOutcome(undefined);setBlurred(false);setTextBoxes([])
  const job=++generation.current;let canvas:HTMLCanvasElement|undefined
  const passes:ScanPassDiagnostic[]=[]
  const report=showDiagnostics&&diagnosticsEnabled?{schema:1,appVersion:__APP_VERSION__,created:new Date().toISOString(),browser:navigator.userAgent,viewport:{width:window.innerWidth,height:window.innerHeight,pixelRatio:window.devicePixelRatio},camera:{focus:focusReport.current,flashRequested:flashOn,flashSupported,width:video.current.videoWidth,height:video.current.videoHeight,settings:Object.fromEntries(Object.entries(stream.current?.getVideoTracks()[0]?.getSettings()??{}).filter(([key])=>['width','height','aspectRatio','frameRate','facingMode','focusMode','exposureMode','torch','zoom'].includes(key))),crop:scanFrameBounds(video.current.videoWidth,video.current.videoHeight),preview:video.current.getBoundingClientRect().toJSON()},capture:undefined as {width:number;height:number;image:string;source:string;sharpness:number;sourceWidth?:number;sourceHeight?:number;reason?:string}|undefined,passes,result:undefined as unknown,error:''}:undefined
  setDiagnosticReport(undefined)
  try{
   const captured=await captureNamePhoto(video.current,photoCamera.current,flashOn,()=>generation.current===job)
   canvas=captured.canvas;if(generation.current!==job)return
   const sharpness=captureSharpness(canvas);setBlurred(sharpness<.08)
   if(report)report.capture={width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/png'),source:captured.source,sharpness,sourceWidth:'sourceWidth' in captured?captured.sourceWidth:undefined,sourceHeight:'sourceHeight' in captured?captured.sourceHeight:undefined,reason:'reason' in captured?captured.reason:undefined};captureCanvas.current=canvas;setPhoto(canvas.toDataURL('image/jpeg',.8))
   if(documentIndex.current===undefined){documentIndex.current=documents.length;setDocuments(old=>[...old,'unmatched'])}else classify(documentIndex.current,'unmatched')
   const current=getRecognizer();await previewRead.current?.catch(()=>{})
   if(generation.current!==job)return
   const result=await current.recognize(canvas,masterBlueprints,report?pass=>passes.push(pass):undefined)
   if(generation.current!==job)return
   if(report)report.result={confidence:result.confidence,candidates:result.candidates.map(c=>({id:c.blueprint.id,name:c.blueprint.name,score:c.score}))}
   setMatch(result)
   if(result.confidence==='high')choose(result.candidates[0].blueprint)
  }catch(e){if(report)report.error=e instanceof Error?e.message:String(e);if(generation.current===job){setError(e instanceof Error?'Recognition failed: '+e.message:'Recognition failed. Try again.');closeRecognition()}}
  finally{if(report&&generation.current===job)setDiagnosticReport(JSON.stringify(report,null,2));if(canvas)canvas.width=canvas.height=0;if(captureCanvas.current===canvas)captureCanvas.current=undefined;if(generation.current===job){busy.current=false;setAnalyzing(false)}}
 }
 const autoCaptureNow=useEffectEvent(()=>void capture())
 useEffect(()=>{
  if(camera!=='ready'||photo||analyzing)return
  let cancelled=false,timer:number|undefined,stability:AutoCaptureStability={count:0}
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=Math.round(800/3.4)
  const context=canvas.getContext('2d'),current=getRecognizer()
  async function update(){
   if(cancelled||busy.current||focusing||document.visibilityState!=='visible')return
   const target=video.current
   if(!target?.videoWidth||!context)return
   try{
    const frame=scanFrameBounds(target.videoWidth,target.videoHeight)
    context.filter='grayscale(1) contrast(1.4)';context.drawImage(target,frame.x,frame.y,frame.width,frame.height,0,0,canvas.width,canvas.height)
    const operation=current.detect?.(canvas);previewRead.current=operation
    const lines=await operation
    if(!cancelled&&!busy.current){
     setTextBoxes((lines??[]).slice(0,40).map(line=>line.poly.map(([x,y])=>[.05+.9*x/canvas.width,.05+.9*y/canvas.height])))
     stability=advanceAutoCapture(stability,matchPaddleLines(lines??[],masterBlueprints))
     if(autoCapture&&stability.count>=2){previewRead.current=undefined;autoCaptureNow()}
    }
   }catch{if(!cancelled)setTextBoxes([])}
   finally{if(!cancelled)previewRead.current=undefined;if(!cancelled)timer=window.setTimeout(()=>void update(),1800)}
  }
  void (async()=>{try{await current.initialize?.()}catch{/* Manual capture retains the local fallback. */return}if(!cancelled)void update()})()
  return()=>{cancelled=true;if(timer!==undefined)window.clearTimeout(timer);void previewRead.current?.finally(()=>{canvas.width=canvas.height=0}).catch(()=>{});if(!previewRead.current)canvas.width=canvas.height=0}
 },[camera,photo,analyzing,focusing,autoCapture,destinationValid])
 function reset(next:boolean){if(busy.current)return;currentOutcome.current=undefined;setPhoto(undefined);setTextBoxes([]);setDiagnosticReport(undefined);setBlurred(false);setMatch(undefined);setSelected(undefined);setOutcome(undefined);setError('');if(next)documentIndex.current=undefined}
 function acquire(){
  if(busy.current||!selected||!destinationValid||currentOutcome.current==='acquired'||currentOutcome.current==='owned'||documentIndex.current===undefined)return
  busy.current=true
  try{const result=onAcquire(destinationId,selected);classify(documentIndex.current,result.alreadyOwned?'owned':'acquired');setError('')}
  catch(e){setError(e instanceof Error?e.message:'Unable to save acquisition. No success recorded.')}
  finally{busy.current=false}
 }
 function exit(){invalidate();releaseCamera();closeRecognition();setPhoto(undefined);setDiagnosticReport(undefined);setAnalyzing(false);setSummary(true)}
 const counters=scanCounters(documents)
 if(summary)return <section className="scanner-panel"><h2>Scan Session Complete</h2><p>{counters.scanned} Blueprints scanned · {counters.acquired} marked Acquired · {counters.owned} already Acquired · {counters.unmatched} unmatched</p><button type="button" className="primary-button" onClick={onDone}>Done</button></section>
 return <section className="scanner-panel" data-tour-blocked="true" aria-label="Blueprint scanner"><h2>Scan &amp; Acquire</h2><p className="scanner-destination">To: <strong>{destinationName}</strong></p>
 <p className="scanner-counts" aria-live="polite">{counters.scanned} scanned · {counters.acquired} acquired</p>

 {!destinationValid&&<p role="alert">The destination collection changed or was deleted. Exit and select the correct collection before scanning.</p>}
 {error&&<p role="alert">{error}</p>}
 <div className="scanner-result" aria-live="polite">
 {ocrLoading?<LoadingIndicator label="Loading OCR Library"/>:analyzing&&<LoadingIndicator label="Reading Item Name…"/>}
 {selected&&<><h3>Blueprint identified: {selected.name}</h3>{outcome==='owned'?<p className="scanner-success">Already Acquired</p>:outcome==='acquired'?<p className="scanner-success">Acquired and saved in {destinationName}.</p>:<button type="button" className="primary-button" disabled={!destinationValid||analyzing} onClick={acquire}>Acquire {selected.name}</button>}</>}
 {match?.confidence==='ambiguous'&&!selected&&<><p>Recognition is uncertain. Choose the correct Blueprint before acquiring.</p>{match.candidates.map(c=><button key={c.blueprint.id} className="secondary-button" type="button" onClick={()=>choose(c.blueprint)}>{c.blueprint.name}</button>)}</>}
 {showDiagnostics&&match?.readText&&match.confidence!=='high'&&<p className="scanner-read-text">Read from photo: “{match.readText}”</p>}
 {match?.confidence==='none'&&<p>Blueprint not identified. Check the captured name and try again.</p>}
 </div>
 {photo&&blurred&&!analyzing&&match?.confidence!=='high'&&<p role="status">Name looks soft. Check focus before retaking.</p>}
 <CameraPreview videoRef={video} photo={photo} autoCapture={autoCapture} textBoxes={textBoxes} onReady={()=>setCamera('ready')}/>

 {focusMessage&&camera==='ready'&&!photo&&<p role="status">{focusMessage}</p>}
 {showDiagnostics&&<details><summary>Scan Diagnostics</summary><p>Enable before capturing to save the exact OCR images, recognized text, matching results and camera details. Nothing is uploaded. The download contains the photographed name area; share it only when you choose.</p><label><input type="checkbox" checked={diagnosticsEnabled} disabled={analyzing} onChange={e=>{setDiagnosticsEnabled(e.target.checked);setDiagnosticReport(undefined)}}/> Collect diagnostics for the next capture</label>
 {diagnosticReport&&<button type="button" className="secondary-button" onClick={()=>{const url=URL.createObjectURL(new Blob([diagnosticReport],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='wasteland-scan-diagnostics.json';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000)}}>Download Scan Diagnostics</button>}</details>}
 <div className="scanner-controls">
 {camera==='ready'&&!photo&&<button type="button" className="secondary-button" aria-pressed={autoCapture} disabled={analyzing} onClick={()=>{setAutoCapture(value=>!value);setTextBoxes([])}}>Auto Capture: {autoCapture?'On':'Off'}</button>}
 {camera==='ready'&&!photo&&flashSupported&&<button type="button" className="secondary-button" aria-pressed={flashOn} disabled={analyzing} onClick={()=>setFlashOn(!flashOn)}>Flash: {flashOn?'On':'Off'}</button>}
 {camera==='ready'&&!photo&&focusSupported&&<button type="button" className="secondary-button" disabled={analyzing||focusing} onClick={()=>void refocus()}>{focusing?'Requesting Focus…':'Refocus'}</button>}
 {camera==='ready'&&!photo&&<button type="button" className="primary-button" disabled={analyzing||focusing||ocrLoading||!destinationValid} onClick={()=>void capture()}>Capture Photo</button>}
 {camera==='stopped'&&<button type="button" className="secondary-button" disabled={!destinationValid} onClick={()=>{setCamera('opening');setError('');setAttempt(n=>n+1)}}>Resume Camera</button>}
 {camera==='opening'&&<p role="status">Opening camera…</p>}
 {photo&&outcome!=='acquired'&&<button type="button" className="secondary-button" disabled={analyzing} onClick={()=>reset(false)}>Retake Photo / Try Again</button>}
 {photo&&<button type="button" className="primary-button" disabled={analyzing} onClick={()=>reset(true)}>Scan Next Blueprint</button>}
 <button type="button" className="secondary-button" onClick={exit}>Exit Scanner</button>
 </div>
 {!photo&&<details className="scanner-aiming-guide"><summary>Where to aim</summary><p>Fill the frame with the complete Item Name row. Yellow highlights show detected text; they do not confirm a match.</p><figure><div className="scanner-example"><img src={import.meta.env.BASE_URL+'scanner/aiming-example.jpg'} alt="Real Freeiron Dry Pack blueprint with the Item Name row outlined in yellow" loading="lazy"/><span aria-hidden="true"/></div><figcaption>Aim at this row. The rest of the blueprint is not needed.</figcaption></figure></details>}
 </section>
}
