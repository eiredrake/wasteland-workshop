import {useCallback,useEffect,useRef,useState,type PointerEvent,type RefObject} from 'react'
import type {PreparedImage} from '../../services/scanner/StaticImageInput'
import {reviewView,targetingBox,targetInImage,zoomView,moveGesture,type ViewTransform} from '../../services/scanner/ReviewGeometry'
import type {DiagnosticInput} from '../../services/scanner/Diagnostics'
import {scannerError,type ScannerError} from '../../services/ocr/OcrTypes'
import type {TargetRegion} from '../../services/ocr/OcrTypes'
import {useViewportSize} from './useViewportSize'
import './ScannerViewport.css'
export type ReviewTransformation={viewportWidth:number;viewportHeight:number;scale:number;offsetX:number;offsetY:number;targetX:number;targetY:number;targetWidth:number;targetHeight:number}
export default function StaticImageReview({image,disabled,canConfirm,onConfirm,onReplace,confirmRef,record,onError}:{record?:(event:DiagnosticInput)=>void;onError?:(error:ScannerError)=>void;image:PreparedImage;disabled:boolean;canConfirm:boolean;onConfirm:(target:TargetRegion,transform:ReviewTransformation)=>void;onReplace:()=>void;confirmRef:RefObject<HTMLButtonElement|null>}){
 const viewport=useRef<HTMLDivElement>(null),imageElement=useRef<HTMLImageElement>(null),points=useRef(new Map<number,{x:number;y:number}>())
 const [imageReady,setImageReady]=useState(false),[view,setView]=useState<ViewTransform>({x:0,y:0,scale:0}),current=useRef(view),previousSize=useRef({width:0,height:0})
 const resize=useCallback((nextSize:{width:number;height:number})=>{
  if(!nextSize.width||!nextSize.height)return
  const old=previousSize.current
  let next:ViewTransform
  if(!old.width||!current.current.scale)next=reviewView(image,nextSize,image.initialTarget)
  else{const scale=current.current.scale*(nextSize.width/old.width),centerX=(old.width/2-current.current.x)/current.current.scale,centerY=(old.height/2-current.current.y)/current.current.scale;next={scale,x:nextSize.width/2-centerX*scale,y:nextSize.height/2-centerY*scale}}
  previousSize.current=nextSize;current.current=next;setView(next);points.current.clear()
 },[image])
 const size=useViewportSize(viewport,resize),box=targetingBox(size),initial=size.width>0?reviewView(image,size,image.initialTarget):{x:0,y:0,scale:0}
 const minScale=initial.scale/8,maxScale=initial.scale*16
 function change(next:ViewTransform){current.current=next;setView(next)}
 const previewEvent=useCallback((event:Partial<DiagnosticInput>&{type:string})=>record?.({stage:'image',scanId:image.acquisitionId,acquisitionId:image.acquisitionId,sourceType:image.sourceType,filename:image.file.name,fileSize:image.file.size,mimeType:image.file.type,width:image.width,height:image.height,resourceId:image.acquisitionId+':preview',...event}),[image,record])
 useEffect(()=>{
  const element=imageElement.current;let url:string|undefined
  try{url=URL.createObjectURL(image.blob);previewEvent({type:'IMAGE_REFERENCE_SUCCEEDED',operation:'create-preview-url',api:'URL.createObjectURL',status:'SUCCESS'});if(element)element.src=url}
  catch(cause){const exceptionName=cause instanceof Error?cause.name:typeof cause,exceptionMessage=cause instanceof Error?cause.message:String(cause),error={...scannerError('IMAGE_REFERENCE_FAILED','image','The image preview reference could not be created. '+exceptionMessage),details:{operation:'create-preview-url',api:'URL.createObjectURL',exceptionName,exceptionMessage}};previewEvent({type:'IMAGE_REFERENCE_FAILED',operation:'create-preview-url',api:'URL.createObjectURL',exceptionName,exceptionMessage,error,status:'FAILED'});onError?.(error)}
  return()=>{element?.removeAttribute('src');if(url){URL.revokeObjectURL(url);previewEvent({type:'IMAGE_REFERENCE_REVOKED',operation:'revoke-preview-url',api:'URL.revokeObjectURL',status:'SUCCESS'})}}
 },[image.blob,previewEvent,onError])
 const target=view.scale>0?targetInImage(image,box,view):undefined
 function local(event:PointerEvent){const rect=event.currentTarget.getBoundingClientRect();return {x:event.clientX-rect.left-(viewport.current?.clientLeft??0),y:event.clientY-rect.top-(viewport.current?.clientTop??0)}}
 function down(event:PointerEvent<HTMLDivElement>){if(disabled||event.button!==0)return;event.currentTarget.focus({preventScroll:true});try{event.currentTarget.setPointerCapture(event.pointerId)}catch{/* A browser may cancel a pointer before capture. */}points.current.set(event.pointerId,local(event))}
 function move(event:PointerEvent<HTMLDivElement>){if(disabled||!points.current.has(event.pointerId))return;const before=[...points.current.values()];points.current.set(event.pointerId,local(event));change(moveGesture(current.current,before,[...points.current.values()],minScale,maxScale))}
 function end(event:PointerEvent<HTMLDivElement>){points.current.delete(event.pointerId);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function zoom(factor:number){if(!view.scale)return;change(zoomView(current.current,{x:size.width/2,y:size.height/2},Math.min(maxScale,Math.max(minScale,current.current.scale*factor))))}
 function reset(){points.current.clear();change(reviewView(image,size,image.initialTarget))}
 function confirm(){if(disabled||!canConfirm||!target?.ok)return;points.current.clear();onConfirm({...target.value},{viewportWidth:size.width,viewportHeight:size.height,scale:view.scale,offsetX:view.x,offsetY:view.y,targetX:box.x,targetY:box.y,targetWidth:box.width,targetHeight:box.height})}
 return <div className="scanner-static-review">
 <h3>Review Image</h3>
 <div ref={viewport} className="scanner-viewport scanner-review-viewport" role="group" aria-label="Position blueprint image" aria-describedby="scanner-position-help" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={event=>points.current.delete(event.pointerId)} onKeyDown={event=>{
  if(disabled)return
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const step=event.shiftKey?80:20;change({...current.current,x:current.current.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:current.current.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)})}
  else if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.25)}else if(event.key==='-'){event.preventDefault();zoom(.8)}else if(event.key==='Home'){event.preventDefault();reset()}
 }}>
 <img ref={imageElement} onLoad={()=>{setImageReady(true);previewEvent({type:'IMAGE_PREVIEW_READY',operation:'display-preview',api:'HTMLImageElement.load',status:'SUCCESS'})}} onError={()=>{const error=scannerError('IMAGE_PREVIEW_FAILED','image','The decoded image could not be displayed.');previewEvent({type:'IMAGE_PREVIEW_FAILED',operation:'display-preview',api:'HTMLImageElement.error',status:'FAILED',error});onError?.(error)}} alt="Selected static blueprint" draggable={false} className="scanner-review-image" width={image.width} height={image.height} style={{width:image.width,height:image.height,transform:'translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')'}}/>
 {size.width>0&&<div className="scanner-target" aria-hidden="true" style={{left:box.x,top:box.y,width:box.width,height:box.height}}/>}
 </div>
 <p id="scanner-position-help">Move the image beneath the yellow box. Drag or pinch to position it. You can also use the arrow keys and zoom buttons.</p>
 <div className="scanner-review-tools"><button type="button" className="secondary-button" disabled={disabled||view.scale>=maxScale} onClick={()=>zoom(1.25)}>Zoom In</button><button type="button" className="secondary-button" disabled={disabled||view.scale<=minScale} onClick={()=>zoom(.8)}>Zoom Out</button><button type="button" className="secondary-button" disabled={disabled} onClick={reset}>Reset View</button></div>
 {target&&!target.ok&&<p role="alert">{target.error.message}</p>}
 <div className="scanner-review-actions"><button ref={confirmRef} type="button" className="primary-button primary-button-cream" disabled={disabled||!canConfirm||!imageReady||!target?.ok} onClick={confirm}>Confirm Image</button>{image.sourceType==='CAMERA_CAPTURE'&&<button type="button" className="secondary-button" disabled={disabled} onClick={onReplace}>Retake</button>}</div>
 </div>
}
