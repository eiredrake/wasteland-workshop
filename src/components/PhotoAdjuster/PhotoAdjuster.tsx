import { useRef } from 'react'
import type { PhotoCrop } from '../../features/scanner/PhotoImage'
import './PhotoAdjuster.css'
export default function PhotoAdjuster({photo,crop,onChange,disabled}:{photo:string;crop:PhotoCrop;onChange:(crop:PhotoCrop)=>void;disabled:boolean}) {
 const start=useRef<{x:number;y:number}|undefined>(undefined)
 function point(event:React.PointerEvent<HTMLDivElement>){const rect=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}}
 return <div className="photo-adjuster" onPointerDown={event=>{if(disabled)return;start.current=point(event);event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event=>{if(disabled||!start.current)return;const end=point(event),x=Math.min(start.current.x,end.x),y=Math.min(start.current.y,end.y),width=Math.abs(end.x-start.current.x),height=Math.abs(end.y-start.current.y);if(width>.01&&height>.01)onChange({x,y,width,height})}} onPointerUp={()=>{start.current=undefined}} onPointerCancel={()=>{start.current=undefined}}>
 <img src={photo} alt="Selected blueprint photograph. Drag a rectangle around the Item Name row to crop." draggable={false}/><span className="photo-crop" aria-hidden="true" style={{left:crop.x*100+'%',top:crop.y*100+'%',width:crop.width*100+'%',height:crop.height*100+'%'}}/>
 </div>
}
