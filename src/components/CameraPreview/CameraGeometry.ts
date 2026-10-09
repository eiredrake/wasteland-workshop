// Portrait document frame fits inside 90% of either portrait or landscape video.
export function scanFrameBounds(width:number,height:number) {
 const cropWidth=Math.min(width*.9,height*.9*.77),cropHeight=cropWidth/.77
 return {x:(width-cropWidth)/2,y:(height-cropHeight)/2,width:cropWidth,height:cropHeight}
}
