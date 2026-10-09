// A wide Item Name strip, centered inside either video orientation.
export const NAME_STRIP_ASPECT = 3.4
export function scanFrameBounds(width:number,height:number) {
 const cropWidth=Math.min(width*.9,height*.9*NAME_STRIP_ASPECT),cropHeight=cropWidth/NAME_STRIP_ASPECT
 return {x:(width-cropWidth)/2,y:(height-cropHeight)/2,width:cropWidth,height:cropHeight}
}
