import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import { captureScanFrame } from './ScanOcr'
export type StillCamera={getPhotoCapabilities:()=>Promise<{fillLightMode?:string[]}>;takePhoto:(settings?:{fillLightMode:string})=>Promise<Blob>}
export function stillCamera(track:MediaStreamTrack):StillCamera|undefined {
 const constructor=(window as unknown as {ImageCapture?:new(track:MediaStreamTrack)=>StillCamera}).ImageCapture
 try{return constructor?new constructor(track):undefined}catch{return undefined}
}
// Center-cover mapping preserves the same field of view when a still has a different aspect ratio.
export function stillFrameBounds(width:number,height:number,videoWidth:number,videoHeight:number){
 const scale=Math.max(videoWidth/width,videoHeight/height),visibleWidth=videoWidth/scale,visibleHeight=videoHeight/scale
 const frame=scanFrameBounds(videoWidth,videoHeight)
 return {x:(width-visibleWidth)/2+frame.x/scale,y:(height-visibleHeight)/2+frame.y/scale,width:frame.width/scale,height:frame.height/scale}
}
export async function captureNamePhoto(video:HTMLVideoElement,camera:StillCamera|undefined,flash:boolean,active:()=>boolean){
 const videoWidth=video.videoWidth,videoHeight=video.videoHeight
 if(!videoWidth||!videoHeight)throw new Error('Camera is not ready. Wait for the preview and try again.')
 if(camera){
  let bitmap:ImageBitmap|undefined
  try{
   const blob=await camera.takePhoto({fillLightMode:flash?'flash':'off'})
   if(!active())throw new Error('Capture cancelled.')
   bitmap=await createImageBitmap(blob)
   if(!active())throw new Error('Capture cancelled.')
   const frame=stillFrameBounds(bitmap.width,bitmap.height,videoWidth,videoHeight),canvas=document.createElement('canvas')
   const scale=Math.min(1,2200/frame.width);canvas.width=Math.round(frame.width*scale);canvas.height=Math.round(frame.height*scale)
   canvas.getContext('2d')!.drawImage(bitmap,frame.x,frame.y,frame.width,frame.height,0,0,canvas.width,canvas.height)
   return {canvas,source:'still-photo',sourceWidth:bitmap.width,sourceHeight:bitmap.height,frame}
  }catch(error){
   if(!active()||flash)throw error // Never silently substitute a non-flash video frame for requested flash.
   return {canvas:captureScanFrame(video),source:'video-fallback',reason:error instanceof Error?error.message:String(error)}
  }finally{bitmap?.close()}
 }
 if(!active())throw new Error('Capture cancelled.')
 return {canvas:captureScanFrame(video),source:'video-frame'}
}
