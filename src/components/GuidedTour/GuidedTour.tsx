import BackButton from '../BackButton/BackButton'
import { useEffect, useRef, useState } from 'react'
import { findTour } from '../../features/tours/TourRegistry'
import type { ActiveTour } from '../../features/tours/useGuidedTours'
import './GuidedTour.css'
type Props={active:ActiveTour;onMove:(index:number)=>void;onExit:()=>void;onFinish:()=>void;canUseExisting:boolean}
export default function GuidedTour({active,onMove,onExit,onFinish,canUseExisting}:Props){
 const tour=findTour(active.id)!,step=tour.steps[active.index],heading=useRef<HTMLHeadingElement>(null),panel=useRef<HTMLElement>(null)
 useEffect(()=>{
  const previous=document.activeElement
  return()=>{const target=previous instanceof HTMLElement&&previous.isConnected&&previous!==document.body?previous:document.querySelector<HTMLElement>('[data-tour-target="menu"]');target?.focus({preventScroll:true})}
 },[])
 const exit=useRef(onExit)
 useEffect(()=>{exit.current=onExit},[onExit])
 const [available,setAvailable]=useState(false),[blocked,setBlocked]=useState(false)
 useEffect(()=>{
  let highlighted:HTMLElement|null=null
  const refresh=()=>{
   const busy=!!document.querySelector('dialog[open],[data-tour-blocked="true"]');setBlocked(busy)
   const next=step.target?document.querySelector<HTMLElement>(`[data-tour-target="${step.target}"]`):null
   setAvailable(!!next)
   if(highlighted!==next){highlighted?.classList.remove('tour-highlight');highlighted=next;next?.classList.add('tour-highlight');if(next&&!busy)next.scrollIntoView({block:'start',behavior:'instant'})}
   if(panel.current)document.documentElement.style.setProperty('--tour-panel-height',`${panel.current.getBoundingClientRect().height+24}px`)
  }
  const observer=new MutationObserver(refresh);observer.observe(document.querySelector('main')!,{childList:true,subtree:true});const timer=window.setInterval(refresh,300)
  const resize=()=>{refresh();highlighted?.scrollIntoView({block:'start',behavior:'instant'})};window.addEventListener('resize',resize)
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){event.preventDefault();exit.current()}}
  document.addEventListener('keydown',escape);refresh();heading.current?.focus({preventScroll:true})
  return()=>{highlighted?.classList.remove('tour-highlight');observer.disconnect();window.clearInterval(timer);window.removeEventListener('resize',resize);document.removeEventListener('keydown',escape);document.documentElement.style.removeProperty('--tour-panel-height')}
 },[step])
 return <aside ref={panel} className="guided-tour" role="region" aria-label="Guided tour" hidden={blocked}>
 <span>{tour.title} · Step {active.index+1} of {tour.steps.length}</span><h3 ref={heading} tabIndex={-1}>{step.title}</h3><p>{step.body}</p>
 {step.target&&!available&&<p className="tour-fallback">This control is not available in your current context. Use the ordinary page controls, or skip this step; no demonstration data will be created.</p>}
 <div className="tour-actions">
 <BackButton disabled={active.index===0} onClick={()=>onMove(active.index-1)}>Previous Step</BackButton>
 {active.index===tour.steps.length-1?<button type="button" className="primary-button" onClick={onFinish}>Finish Tour</button>:step.mode==='action'?<>
 {canUseExisting&&<button type="button" className="primary-button" onClick={()=>onMove(active.index+1)}>Use Existing</button>}
 <button type="button" className="secondary-button" onClick={()=>onMove(active.index+1)}>Skip Step</button></>:<button type="button" className="primary-button" onClick={()=>onMove(active.index+1)}>{active.index===0&&active.id==='intro-blueprints'?'Start Tour':'Next'}</button>}
 {active.index===0&&<button type="button" className="secondary-button" onClick={onExit}>Skip Tour</button>}
 <button type="button" className="secondary-button" onClick={onExit}>Exit Tour</button>
 </div></aside>
}
