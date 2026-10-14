import {scannerError,type Outcome,type TargetRegion} from '../ocr/OcrTypes'
export type ViewTransform={x:number;y:number;scale:number}
export type ViewSize={width:number;height:number}
export function targetingBox(view:ViewSize):TargetRegion{const height=Math.min(88,Math.max(44,view.height*.22));return {x:view.width*.09,y:(view.height-height)/2,width:view.width*.82,height}}
export function fittedView(image:ViewSize,view:ViewSize,cover=false):ViewTransform{const scale=(cover?Math.max:Math.min)(view.width/image.width,view.height/image.height);return {scale,x:(view.width-image.width*scale)/2,y:(view.height-image.height*scale)/2}}
export function reviewView(image:ViewSize,view:ViewSize,initialTarget?:TargetRegion):ViewTransform{
 const box=targetingBox(view)
 if(initialTarget){const scale=Math.max(box.width/initialTarget.width,box.height/initialTarget.height);return {scale,x:box.x+box.width/2-(initialTarget.x+initialTarget.width/2)*scale,y:box.y+box.height/2-(initialTarget.y+initialTarget.height/2)*scale}}
 const fit=fittedView(image,view),scale=Math.max(fit.scale,box.width/image.width,box.height/image.height)
 return {scale,x:(view.width-image.width*scale)/2,y:(view.height-image.height*scale)/2}
}
export function sourceBox(box:TargetRegion,view:ViewTransform):TargetRegion{return {x:(box.x-view.x)/view.scale,y:(box.y-view.y)/view.scale,width:box.width/view.scale,height:box.height/view.scale}}
export function targetInImage(image:ViewSize,box:TargetRegion,view:ViewTransform):Outcome<TargetRegion>{
 if(!Number.isFinite(view.scale)||view.scale<=0||![view.x,view.y,box.x,box.y,box.width,box.height].every(Number.isFinite))return {ok:false,error:scannerError('TARGET_REGION_INVALID','target','The image view is not ready.')}
 const left=(box.x-view.x)/view.scale,top=(box.y-view.y)/view.scale,right=(box.x+box.width-view.x)/view.scale,bottom=(box.y+box.height-view.y)/view.scale
 const tolerance=1e-7
 // Extract the overlap with the image. Empty viewport margins contain no source pixels.
 const x=Math.max(0,Math.ceil(left-tolerance)),y=Math.max(0,Math.ceil(top-tolerance)),width=Math.min(image.width,Math.floor(right+tolerance))-x,height=Math.min(image.height,Math.floor(bottom+tolerance))-y
 if(width<1||height<1)return {ok:false,error:scannerError('TARGET_REGION_INVALID','target','Move the image so the yellow box overlaps the area you want to scan.')}
 return {ok:true,value:{x,y,width,height}}
}
export function zoomView(view:ViewTransform,anchor:{x:number;y:number},nextScale:number):ViewTransform{const ratio=nextScale/view.scale;return {scale:nextScale,x:anchor.x-(anchor.x-view.x)*ratio,y:anchor.y-(anchor.y-view.y)*ratio}}
export function moveGesture(view:ViewTransform,before:{x:number;y:number}[],after:{x:number;y:number}[],minScale:number,maxScale:number):ViewTransform{
 if(before.length<2||after.length<2)return {...view,x:view.x+after[0].x-before[0].x,y:view.y+after[0].y-before[0].y}
 const midpoint=(points:{x:number;y:number}[])=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}),a=midpoint(before),b=midpoint(after),oldDistance=Math.hypot(before[1].x-before[0].x,before[1].y-before[0].y),distance=Math.hypot(after[1].x-after[0].x,after[1].y-after[0].y)
 const next=zoomView(view,a,Math.min(maxScale,Math.max(minScale,view.scale*(oldDistance>0?distance/oldDistance:1))))
 return {...next,x:next.x+b.x-a.x,y:next.y+b.y-a.y}
}
