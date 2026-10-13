// A wide Item Name strip, centered inside either video orientation.
export const NAME_STRIP_ASPECT = 3.4
export function scanFrameBounds(width:number,height:number) {
 const cropWidth=Math.min(width*.9,height*.9*NAME_STRIP_ASPECT),cropHeight=cropWidth/NAME_STRIP_ASPECT
 return {x:(width-cropWidth)/2,y:(height-cropHeight)/2,width:cropWidth,height:cropHeight}
}

// Convert a displayed tap through object-fit: cover into full-sensor coordinates.
export function cameraFocusPoint(width:number,height:number,viewWidth:number,viewHeight:number,x:number,y:number){
 const scale=Math.max(viewWidth/width,viewHeight/height)
 return {x:Math.max(0,Math.min(1,(x+(width*scale-viewWidth)/2)/(width*scale))),y:Math.max(0,Math.min(1,(y+(height*scale-viewHeight)/2)/(height*scale)))}
}
