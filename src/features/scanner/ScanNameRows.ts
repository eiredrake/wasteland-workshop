import { normalizeScanContrast } from './ScanQuality'
// Local grayscale threshold suppresses blue paper and uneven illumination without boosting the dark header.
export function thresholdNamePixels(rgba:Uint8ClampedArray,width:number,height:number,flatten=false):Uint8ClampedArray {
 const gray=new Uint8Array(width*height),integral=new Float64Array((width+1)*(height+1))
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const i=y*width+x;gray[i]=Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2]);sum+=gray[i];integral[(y+1)*(width+1)+x+1]=integral[y*(width+1)+x+1]+sum}}
 const out=new Uint8ClampedArray(rgba.length),radius=Math.max(8,Math.round(width/70))
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const left=Math.max(0,x-radius),right=Math.min(width,x+radius+1),top=Math.max(0,y-radius),bottom=Math.min(height,y+radius+1),stride=width+1
  const mean=(integral[bottom*stride+right]-integral[top*stride+right]-integral[bottom*stride+left]+integral[top*stride+left])/((right-left)*(bottom-top))
  const value=flatten?Math.max(0,Math.min(255,Math.round(245+(gray[y*width+x]-mean)*8))):gray[y*width+x]<mean-12?0:255,i=(y*width+x)*4
  out[i]=out[i+1]=out[i+2]=value;out[i+3]=255
 }
 return out
}
export type NameRow={y:number;height:number}
export function findNameRows(rgba:Uint8ClampedArray,width:number,height:number):NameRow[]{
 // Look for separated text-height bands inside the page. Header texture and horizontal rules are too dense.
 const left=Math.round(width*.14),right=Math.round(width*.9),density=[]
 for(let y=0;y<height;y++){let ink=0;for(let x=left;x<right;x++)if(rgba[(y*width+x)*4]===0)ink++;density.push(ink/(right-left))}
 const bands:NameRow[]=[];let start=-1,last=-1
 for(let y=0;y<=height;y++){
  const active=y<height&&density[y]>.012&&density[y]<.32
  if(active){if(start<0)start=y;last=y}
  if(start>=0&&(!active&&y-last>3||y===height)){
   const h=last-start+1
   if(h>=Math.max(5,width*.003)&&h<width*.065){const pad=Math.max(6,Math.round(h*.4));bands.push({y:Math.max(0,start-pad),height:Math.min(height,start+h+pad)-Math.max(0,start-pad)})}
   start=-1
  }
 }
 return bands.filter(row=>row.height<width*.045).slice(0,3)
}
export function isolateNameRows(image:HTMLCanvasElement){
 const binary=document.createElement('canvas');binary.width=image.width;binary.height=image.height
 const context=binary.getContext('2d',{willReadFrequently:true})!;context.filter='blur(1px)';context.drawImage(image,0,0);context.filter='none'
 const pixels=context.getImageData(0,0,binary.width,binary.height);pixels.data.set(thresholdNamePixels(pixels.data,binary.width,binary.height));context.putImageData(pixels,0,0)
 cleanNamePixels(pixels.data,binary.width,binary.height);context.putImageData(pixels,0,0)
 const rows=findNameRows(pixels.data,binary.width,binary.height)
 return {binary,rows}
}

export function cleanNamePixels(rgba:Uint8ClampedArray,width:number,height:number){
 const visited=new Uint8Array(width*height),stack:number[]=[]
 for(let seed=0;seed<visited.length;seed++){
  if(visited[seed]||rgba[seed*4]!==0)continue
  const component:number[]=[];stack.push(seed);visited[seed]=1
  let minX=width,maxX=0,minY=height,maxY=0
  while(stack.length){const i=stack.pop()!,x=i%width,y=Math.floor(i/width);component.push(i);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)
   for(const next of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1])if(next>=0&&!visited[next]&&rgba[next*4]===0){visited[next]=1;stack.push(next)}
  }
  const h=maxY-minY+1,w=maxX-minX+1
  if(component.length<8||h<5||h>width*.05||w>width*.18)for(const i of component)rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=255
 }
}

export function prepareNameRow(image:HTMLCanvasElement,row:NameRow,variant:'grayscale'|'local-background'){
 // The second-column retry may clip a long/wrapped name, so its matches must remain suggestions.
 const x=image.width*(variant==='grayscale'?.16:.32),width=image.width*(variant==='grayscale'?.7:.4)
 const crop=document.createElement('canvas');crop.width=Math.round(width);crop.height=row.height
 const context=crop.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,x,row.y,width,row.height,0,0,crop.width,crop.height)
 const pixels=context.getImageData(0,0,crop.width,crop.height)
 if(variant==='grayscale')normalizeScanContrast(pixels.data)
 else pixels.data.set(thresholdNamePixels(pixels.data,crop.width,crop.height,true))
 context.putImageData(pixels,0,0)
 // Add white padding after enhancing the crop: padding must not distort contrast statistics.
 const padded=document.createElement('canvas');padded.width=crop.width+40;padded.height=crop.height+40
 const target=padded.getContext('2d')!;target.fillStyle='white';target.fillRect(0,0,padded.width,padded.height);target.drawImage(crop,20,20);crop.width=crop.height=0
 return padded
}
