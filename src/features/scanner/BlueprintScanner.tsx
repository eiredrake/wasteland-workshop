import { useEffect, useRef, useState } from 'react'
import CameraPreview from '../../components/CameraPreview/CameraPreview'
import type { Blueprint } from '../blueprints/Blueprint'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
import { masterBlueprints } from '../blueprints/blueprints'
import type { ScanMatch } from './ScanMatching'
import { captureScanFrame, createScanRecognizer, type ScanRecognizer } from './ScanOcr'
import { scanCounters, type ScanOutcome } from './ScanSession'
import './BlueprintScanner.css'
type Props={collection:BlueprintCollection|undefined;destinationName:string;destinationId:string;activeId:string|undefined;onAcquire:(collectionId:string,blueprint:Blueprint)=>{alreadyOwned:boolean};onDone:()=>void}
export default function BlueprintScanner({collection,destinationName,destinationId,activeId,onAcquire,onDone}:Props){
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|undefined>(undefined),recognizer=useRef<ScanRecognizer|undefined>(undefined),generation=useRef(0),busy=useRef(false)
 const [camera,setCamera]=useState<'opening'|'ready'|'stopped'>('opening'),[error,setError]=useState(''),[analyzing,setAnalyzing]=useState(false),[photo,setPhoto]=useState<string>(),[match,setMatch]=useState<ScanMatch>(),[selected,setSelected]=useState<Blueprint>(),[summary,setSummary]=useState(false),[documents,setDocuments]=useState<ScanOutcome[]>([]),[outcome,setOutcome]=useState<ScanOutcome>(),[attempt,setAttempt]=useState(0)
 const captureCanvas=useRef<HTMLCanvasElement|undefined>(undefined)
 const currentOutcome=useRef<ScanOutcome|undefined>(undefined)
 const documentIndex=useRef<number|undefined>(undefined)
 const destinationValid=!!collection&&activeId===destinationId
 function invalidate(){generation.current++;if(captureCanvas.current)captureCanvas.current.width=captureCanvas.current.height=0;captureCanvas.current=undefined}
 function releaseCamera(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=undefined;if(video.current)video.current.srcObject=null}
 function closeRecognition(){const current=recognizer.current;recognizer.current=undefined;void current?.close()}
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
    // Best-effort continuous autofocus where the device exposes it; unsupported devices continue normally.
    try {
     const rearTrack=media.getVideoTracks()[0]
     const capabilities=rearTrack?.getCapabilities?.() as (MediaTrackCapabilities & {focusMode?:string[]})|undefined
     if(capabilities?.focusMode?.includes('continuous'))await rearTrack.applyConstraints({focusMode:'continuous'} as MediaTrackConstraints)
    }catch{/* Unsupported autofocus retains the camera's default behavior. */}
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
 async function capture(){
  if(busy.current||camera!=='ready'||!destinationValid||!video.current)return
  busy.current=true;currentOutcome.current=undefined;setAnalyzing(true);setError('');setMatch(undefined);setSelected(undefined);setOutcome(undefined)
  const job=++generation.current;let canvas:HTMLCanvasElement|undefined
  try{
   canvas=captureScanFrame(video.current);captureCanvas.current=canvas;setPhoto(canvas.toDataURL('image/jpeg',.8))
   if(documentIndex.current===undefined){documentIndex.current=documents.length;setDocuments(old=>[...old,'unmatched'])}else classify(documentIndex.current,'unmatched')
   recognizer.current??=createScanRecognizer()
   const result=await recognizer.current.recognize(canvas,masterBlueprints)
   if(generation.current!==job)return
   setMatch(result)
   if(result.confidence==='high')choose(result.candidates[0].blueprint)
  }catch(e){if(generation.current===job){setError(e instanceof Error?'Recognition failed: '+e.message:'Recognition failed. Try again.');closeRecognition()}}
  finally{if(canvas)canvas.width=canvas.height=0;if(captureCanvas.current===canvas)captureCanvas.current=undefined;if(generation.current===job){busy.current=false;setAnalyzing(false)}}
 }
 function reset(next:boolean){if(busy.current)return;currentOutcome.current=undefined;setPhoto(undefined);setMatch(undefined);setSelected(undefined);setOutcome(undefined);setError('');if(next)documentIndex.current=undefined}
 function acquire(){
  if(busy.current||!selected||!destinationValid||currentOutcome.current==='acquired'||currentOutcome.current==='owned'||documentIndex.current===undefined)return
  busy.current=true
  try{const result=onAcquire(destinationId,selected);classify(documentIndex.current,result.alreadyOwned?'owned':'acquired');setError('')}
  catch(e){setError(e instanceof Error?e.message:'Unable to save acquisition. No success recorded.')}
  finally{busy.current=false}
 }
 function exit(){invalidate();releaseCamera();closeRecognition();setPhoto(undefined);setAnalyzing(false);setSummary(true)}
 const counters=scanCounters(documents)
 if(summary)return <section className="scanner-panel"><h2>Scan Session Complete</h2><p>{counters.scanned} Blueprints scanned · {counters.acquired} marked Acquired · {counters.owned} already Acquired · {counters.unmatched} unmatched</p><button type="button" className="primary-button" onClick={onDone}>Done</button></section>
 return <section className="scanner-panel" data-tour-blocked="true" aria-label="Blueprint scanner"><h2>Scan &amp; Acquire</h2><p>Destination: <strong>{destinationName}</strong></p>
 <p className="scanner-counts" aria-live="polite">Scanned: {counters.scanned} | Acquired: {counters.acquired} | Already Owned: {counters.owned} | Unmatched: {counters.unmatched}</p>
 <p>Move closer to the upper-left <strong>Item Name</strong> row. Center the complete name inside the wide frame. The Item Name label is optional; the rest of the page is not needed.</p>
 {!destinationValid&&<p role="alert">The destination collection changed or was deleted. Exit and select the correct collection before scanning.</p>}
 {error&&<p role="alert">{error}</p>}
 <div className="scanner-result" aria-live="polite">
 {analyzing&&<p role="status">Reading Item Name… Keep this screen open. First scan loads the local recognition engine.</p>}
 {selected&&<><h3>Blueprint identified: {selected.name}</h3>{outcome==='owned'?<p className="scanner-success">Already Acquired</p>:outcome==='acquired'?<p className="scanner-success">Acquired and saved in {destinationName}.</p>:<button type="button" className="primary-button" disabled={!destinationValid||analyzing} onClick={acquire}>Acquire {selected.name}</button>}</>}
 {match?.confidence==='ambiguous'&&!selected&&<><p>Recognition is uncertain. Choose the correct Blueprint before acquiring.</p>{match.candidates.map(c=><button key={c.blueprint.id} className="secondary-button" type="button" onClick={()=>choose(c.blueprint)}>{c.blueprint.name}</button>)}</>}
 {match?.readText&&match.confidence!=='high'&&<p className="scanner-read-text">Read from photo: “{match.readText}”</p>}
 {match?.confidence==='none'&&<p>Blueprint not identified. Check the captured name below. Include the full name, move closer, avoid glare and hold still before trying again. No collection data changed.</p>}
 </div>
 <CameraPreview videoRef={video} photo={photo} onReady={()=>setCamera('ready')}/>
 {!photo&&<p>Aim at just the Item Name row, not the whole Blueprint. Photos stay on this device and are discarded after scanning.</p>}
 <div className="scanner-controls">
 {camera==='ready'&&!photo&&<button type="button" className="primary-button" disabled={analyzing||!destinationValid} onClick={()=>void capture()}>Capture Photo</button>}
 {camera==='stopped'&&<button type="button" className="secondary-button" disabled={!destinationValid} onClick={()=>{setCamera('opening');setError('');setAttempt(n=>n+1)}}>Resume Camera</button>}
 {camera==='opening'&&<p role="status">Opening camera…</p>}
 {photo&&outcome!=='acquired'&&<button type="button" className="secondary-button" disabled={analyzing} onClick={()=>reset(false)}>Retake Photo / Try Again</button>}
 {photo&&<button type="button" className="primary-button" disabled={analyzing} onClick={()=>reset(true)}>Scan Next Blueprint</button>}
 <button type="button" className="secondary-button" onClick={exit}>Exit Scanner</button>
 </div></section>
}
