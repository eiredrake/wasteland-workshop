import {useRef,useState,type RefObject} from 'react'
import './ImagePicker.css'
// Acquisition only: every completed native-picker File follows the image path.
export default function ImagePicker({onSelected,onError,buttonRef,onBeforeOpen,camera=false,disabled=false}:{camera?:boolean;disabled?:boolean;onSelected:(file:File)=>void|Promise<void>;onError:(error:unknown)=>void;buttonRef?:RefObject<HTMLButtonElement|null>;onBeforeOpen?:()=>void}){
 const input=useRef<HTMLInputElement>(null),[loading,setLoading]=useState(false)
 function choose(){try{onBeforeOpen?.();if(input.current){input.current.value='';input.current.click()}}catch(error){onError(error)}}
 async function selected(){
  const element=input.current,file=element?.files?.[0]
  if(!file||!element)return
  setLoading(true)
  try{await onSelected(file)}catch(error){onError(error)}
  finally{
   // Keep the provider-backed selection alive until the consumer finishes reading.
   element.value=''
   if(input.current===element)setLoading(false)
  }
 }
 return <div className="image-picker"><input ref={input} type="file" accept={camera?'image/*':undefined} capture={camera?'environment':undefined} hidden onChange={()=>{void selected()}}/><button ref={buttonRef} type="button" className="primary-button primary-button-cream" disabled={loading||disabled} onClick={choose}>{camera?'Scan Image':'Choose Image'}</button></div>
}
