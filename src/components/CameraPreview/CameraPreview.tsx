import { scanFrameBounds } from './CameraGeometry'
import type { RefObject } from 'react'
import './CameraPreview.css'
export default function CameraPreview({videoRef,photo,onReady}:{videoRef:RefObject<HTMLVideoElement|null>;photo?:string;onReady:()=>void}) {
 return <div className="scan-viewfinder">
  <video ref={videoRef} autoPlay playsInline muted hidden={!!photo} onLoadedMetadata={()=>{const element=videoRef.current;if(element?.videoHeight){const frame=scanFrameBounds(element.videoWidth,element.videoHeight),style=element.parentElement?.style;style?.setProperty("--camera-aspect",String(element.videoWidth/element.videoHeight));style?.setProperty("--scan-frame-width",String(frame.width/element.videoWidth*100)+'%');style?.setProperty("--scan-frame-height",String(frame.height/element.videoHeight*100)+'%')}onReady()}} aria-label="Live rear camera preview" />
  {photo&&<img src={photo} alt="Temporary Blueprint capture"/>}
  {!photo&&<div className="scan-target-frame" aria-hidden="true"/>}
 </div>
}
