import { NAME_STRIP_ASPECT, scanFrameBounds } from './CameraGeometry'
import { useEffect, useState, type RefObject } from 'react'
import { assessScanQuality, grayscalePixels, scanQualityMessage, type ScanQuality } from '../../features/scanner/ScanQuality'
import './CameraPreview.css'
export default function CameraPreview({videoRef,photo,onReady}:{videoRef:RefObject<HTMLVideoElement|null>;photo?:string;onReady:()=>void}) {
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
 return <><div className="scan-viewfinder" style={{aspectRatio:NAME_STRIP_ASPECT}}>
  <video ref={videoRef} autoPlay playsInline muted hidden={!!photo} onLoadedMetadata={onReady} aria-label="Live rear camera preview" />
  {photo&&<img src={photo} alt="Temporary capture of the Item Name area"/>}
  {!photo&&<div className="scan-target-frame" data-quality={quality} aria-hidden="true"/>}
 </div>
 {!photo&&<p className="scan-guidance" aria-live="polite">{scanQualityMessage[quality]}</p>}
 </>
}
