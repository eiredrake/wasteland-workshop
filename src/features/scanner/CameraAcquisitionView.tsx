import {useEffect,useRef,useState} from 'react'
import {CameraSession,captureStill,cameraError} from '../../services/scanner/CameraAcquisition'
import {fittedView,targetingBox,targetInImage,sourceBox} from '../../services/scanner/ReviewGeometry'
import {scannerError,type ScannerError,type TargetRegion} from '../../services/ocr/OcrTypes'
import type {DiagnosticInput} from '../../services/scanner/Diagnostics'
import {useViewportSize} from './useViewportSize'
import './ScannerViewport.css'
export default function CameraAcquisitionView({session,onCaptured,onError,onCancel,record}:{session:CameraSession;onCaptured:(file:File,target:TargetRegion,acquisitionId:string)=>void;onError:(error:ScannerError)=>void;onCancel:()=>void;record:(event:DiagnosticInput)=>void}){
 const viewport=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),size=useViewportSize(viewport),box=targetingBox(size)
 const [devices,setDevices]=useState<MediaDeviceInfo[]>([]),[deviceId,setDeviceId]=useState(''),[attempt,setAttempt]=useState(0),[ready,setReady]=useState(false),[paused,setPaused]=useState(false),[opening,setOpening]=useState(true)
 const capturing=useRef(false),suspended=useRef(false),active=useRef(true),id=useRef(crypto.randomUUID())
 useEffect(()=>{
  let live=true;active.current=true;suspended.current=false;const trackCleanups:(()=>void)[]=[];const element=video.current,scanId=crypto.randomUUID();id.current=scanId
  void session.start(deviceId||undefined).then(async result=>{
   if(!live||suspended.current)return
   record({type:'CAMERA_INITIALIZATION_RESULT',stage:'camera',scanId,sourceType:'CAMERA_CAPTURE',status:result.ok?'SUCCESS':'FAILED',error:result.ok?undefined:result.error})
   if(!result.ok){if(result.error.code!=='CAMERA_ABANDONED'){setOpening(false);onError(result.error)}return}
   try{
    if(!element)throw Error('Camera preview is unavailable.')
    for(const track of result.value.getVideoTracks()){
     const ended=()=>{if(!live||suspended.current||capturing.current)return;const error=scannerError('CAMERA_UNAVAILABLE','camera','The camera stopped providing video. Reopen Scan Image or choose another camera.');record({type:'CAMERA_PREVIEW_FAILED',stage:'camera',scanId,sourceType:'CAMERA_CAPTURE',status:'FAILED',error});onError(error)}
     track.addEventListener('ended',ended);trackCleanups.push(()=>track.removeEventListener('ended',ended))
    }
    element.srcObject=result.value;await element.play()
    if(!live||suspended.current)return
    if(element.videoWidth>0&&element.videoHeight>0&&element.readyState>=2)setReady(true)
    setOpening(false)
    const available=await session.cameras();if(live)setDevices(available)
   }catch(cause){if(!live||suspended.current)return;session.stop();setOpening(false);const error=cameraError(cause);record({type:'CAMERA_PREVIEW_FAILED',stage:'camera',scanId,sourceType:'CAMERA_CAPTURE',error,status:'FAILED'});onError(error)}
  })
  function hide(){if(document.visibilityState==='hidden'){suspended.current=true;session.stop();if(element)element.srcObject=null;setReady(false);setOpening(false);setPaused(true);record({type:'CAMERA_PAUSED',stage:'camera',scanId,sourceType:'CAMERA_CAPTURE',status:'STOPPED'})}}
  document.addEventListener('visibilitychange',hide)
  return()=>{live=false;active.current=false;trackCleanups.forEach(cleanup=>cleanup());document.removeEventListener('visibilitychange',hide);session.stop();if(element)element.srcObject=null;record({type:'CAMERA_STOPPED',stage:'camera',scanId,sourceType:'CAMERA_CAPTURE',status:'STOPPED'})}
 },[session,deviceId,attempt,onError,record])
 async function capture(){
  const element=video.current;if(!element||capturing.current||!ready||!size.width)return
  const dimensions={width:element.videoWidth,height:element.videoHeight}
  if(element.readyState<2||dimensions.width<1||dimensions.height<1){const error=scannerError('CAMERA_CAPTURE_FAILED','capture','Wait until the camera has supplied a video frame.');record({type:'CAMERA_CAPTURE_RESULT',stage:'capture',scanId:id.current,sourceType:'CAMERA_CAPTURE',status:'FAILED',error});onError(error);return}
  const frameView=fittedView(dimensions,size,true),target=targetInImage(dimensions,box,frameView)
  if(!target.ok){record({type:'CAMERA_CAPTURE_RESULT',stage:'target',scanId:id.current,sourceType:'CAMERA_CAPTURE',status:'FAILED',error:target.error});onError(target.error);return}
  capturing.current=true;setReady(false)
  // captureStill draws synchronously before encoding yields. Stop tracks immediately after the pixels are frozen.
  const operation=captureStill(element);session.stop()
  const captured=await operation
  if(!active.current)return
  record({type:'CAMERA_CAPTURE_RESULT',stage:'capture',scanId:id.current,sourceType:'CAMERA_CAPTURE',status:captured.ok?'SUCCESS':'FAILED',width:dimensions.width,height:dimensions.height,target:target.value,error:captured.ok?undefined:captured.error})
  if(captured.ok)onCaptured(captured.value,sourceBox(box,frameView),id.current);else{capturing.current=false;onError(captured.error)}
 }
 return <div className="scanner-camera">
 <h3>Camera Preview</h3>
 {devices.length>1&&<div className="scanner-camera-select"><label htmlFor="scanner-camera-device">Camera</label><select id="scanner-camera-device" value={deviceId} disabled={opening||paused} onChange={event=>{setReady(false);setOpening(true);setPaused(false);setDeviceId(event.target.value)}}><option value="">Preferred camera</option>{devices.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||'Camera '+(index+1)}</option>)}</select></div>}
 <div ref={viewport} className="scanner-viewport">
 <video ref={video} autoPlay muted playsInline aria-label="Live camera preview" onLoadedData={()=>{if(!paused&&!suspended.current&&video.current?.videoWidth&&video.current?.videoHeight)setReady(true)}} onError={()=>{const error=scannerError('CAMERA_INITIALIZATION_FAILED','camera','The camera preview could not be displayed.');record({type:'CAMERA_PREVIEW_FAILED',stage:'camera',scanId:id.current,sourceType:'CAMERA_CAPTURE',status:'FAILED',error});onError(error)}}/>
 {size.width>0&&<button type="button" className="scanner-target scanner-target-capture" aria-label="Capture still image inside targeting box" disabled={!ready||opening||paused} style={{left:box.x,top:box.y,width:box.width,height:box.height}} onClick={()=>{void capture()}}/>}
 </div>
 <p>To take a picture, tap the box.</p>
 {opening&&<p role="status">Opening camera…</p>}
 {paused&&<><p role="status">Camera paused while the app was hidden.</p><button type="button" className="primary-button primary-button-cream" onClick={()=>{setReady(false);setOpening(true);setPaused(false);setAttempt(value=>value+1)}}>Resume Camera</button></>}
 <div className="scanner-review-actions"><button type="button" className="secondary-button" onClick={()=>{session.stop();onCancel()}}>Close Camera</button></div>
 </div>
}
