import { cameraFocusPoint, NAME_STRIP_ASPECT, scanFrameBounds } from './CameraGeometry'
import { useEffect, useState, type RefObject } from 'react'
import { assessScanQuality, grayscalePixels, scanQualityMessage, type ScanQuality } from '../../features/scanner/ScanQuality'
import './CameraPreview.css'
export default function CameraPreview({videoRef,photo,onReady,onFocusPoint,textBoxes=[],autoCapture=false}:{videoRef:RefObject<HTMLVideoElement|null>;photo?:string;onReady:()=>void;textBoxes?:number[][][];autoCapture?:boolean;onFocusPoint?:(point:{x:number;y:number})=>void}) {
 const [tap,setTap]=useState<{x:number;y:number}>()
 useEffect(()=>{if(!tap)return;const timer=window.setTimeout(()=>setTap(undefined),1500);return()=>window.clearTimeout(timer)},[tap])
 const [quality,setQuality]=useState<ScanQuality>('aim')
 useEffect(()=>{
  if(photo)return
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=56
  const context=canvas.getContext('2d',{willReadFrequently:true})
  let previous:Uint8Array|undefined
  const timer=window.setInterval(()=>{
   const video=videoRef.current
   if(!video?.videoWidth||video.readyState<2||document.visibilityState!=='visible'||!context)return
   const frame=scanFrameBounds(video.videoWidth,video.videoHeight)
   try {
    context.drawImage(video,frame.x,frame.y,frame.width,frame.height,0,0,192,56)
    const gray=grayscalePixels(context.getImageData(0,0,192,56).data)
    setQuality(assessScanQuality(gray,previous));previous=gray
   }catch{/* Guidance must never prevent manual capture. */}
  },500)
  return()=>{window.clearInterval(timer);previous=undefined;canvas.width=canvas.height=0}
 },[photo,videoRef])
 return <><div className="scan-viewfinder" style={{aspectRatio:NAME_STRIP_ASPECT}} role={!photo?'button':undefined} tabIndex={!photo?0:undefined} aria-label={!photo?'Tap live preview to focus':undefined} onKeyDown={event=>{if(!photo&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onFocusPoint?.({x:.5,y:.5});setTap({x:.5,y:.5})}}} onClick={event=>{const video=videoRef.current;if(photo||!video?.videoWidth)return;const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;setTap({x:x/rect.width,y:y/rect.height});onFocusPoint?.(cameraFocusPoint(video.videoWidth,video.videoHeight,rect.width,rect.height,x,y))}}>
  <video ref={videoRef} autoPlay playsInline muted hidden={!!photo} onLoadedMetadata={onReady} aria-label="Live rear camera preview" />
  {photo&&<img src={photo} alt="Temporary capture of the Item Name area"/>}
  {!photo&&<div className="scan-target-frame" data-quality={quality} aria-hidden="true"/>}
  {!photo&&tap&&<span className="scan-focus-point" aria-hidden="true" style={{left:tap.x*100+'%',top:tap.y*100+'%'}}/>}
  {textBoxes.length>0&&<svg className="scan-text-highlights" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{textBoxes.map((poly,index)=><polygon key={index} points={poly.map(([x,y])=>`${x*100},${y*100}`).join(' ')}/>)}</svg>}
 </div>
 {!photo&&<p className="scan-guidance" aria-live="polite">{autoCapture&&quality==='aim'?'Hold the full name steady. Matching names capture automatically.':scanQualityMessage[quality]} Tap the live view to request focus.</p>}
 </>
}
