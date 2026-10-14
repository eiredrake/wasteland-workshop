import {useEffect,useState,type RefObject} from 'react'
export function useViewportSize(ref:RefObject<HTMLElement|null>,onResize?:(size:{width:number;height:number})=>void){
 const [size,setSize]=useState({width:0,height:0})
 useEffect(()=>{const element=ref.current;if(!element)return
 const observer=new ResizeObserver(entries=>{const rect=entries[0].contentRect;onResize?.({width:rect.width,height:rect.height});setSize(previous=>previous.width===rect.width&&previous.height===rect.height?previous:{width:rect.width,height:rect.height})})
 observer.observe(element);return()=>observer.disconnect()
 },[ref,onResize])
 return size
}
