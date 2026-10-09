import { useEffect, useState } from 'react'
import { findTour, confirmedAction, type TourScreen } from './TourRegistry'
import { completeTour, openTour, shouldOfferIntro, type TourProgress } from './TourProgress'
import { loadTourProgress, saveTourProgress } from './TourRepository'
export type TourSignals=Record<string,string>
export type ActiveTour={id:string;index:number;baseline:string}
export function useGuidedTours(signals:TourSignals,report:(message:string)=>void,navigate:(screen:TourScreen)=>void){
 const [saved]=useState(()=>{try{return {progress:loadTourProgress(),error:''}}catch(error){return {progress:{} as TourProgress,error:error instanceof Error?error.message:'Tour progress unavailable.'}}})
 const [progress,setProgress]=useState(saved.progress),[active,setActive]=useState<ActiveTour>()
 function persist(next:TourProgress){if(saved.error){report(saved.error);return false}try{saveTourProgress(next);setProgress(next);return true}catch(error){report(error instanceof Error?error.message:'Tour progress could not be saved.');return false}}
 function start(id:string){const tour=findTour(id);if(!tour)return;if(persist(openTour(progress,id))){setActive({id,index:0,baseline:signals[tour.steps[0].condition??'']??''});if(tour.steps[0].screen)navigate(tour.steps[0].screen)}}
 function move(index:number){if(!active)return;const step=findTour(active.id)!.steps[index];if(step){setActive({...active,index,baseline:signals[step.condition??'']??''});if(step.screen)navigate(step.screen)}}
 function finish(){if(active&&persist(completeTour(progress,active.id)))setActive(undefined)}
 const step=active?findTour(active.id)!.steps[active.index]:undefined
 const signal=signals[step?.condition??'']??''
 // A confirmed app-state change advances once; only tour UI/navigation state changes here.
 if(active&&step&&confirmedAction(step,active.baseline,signal)&&active.index<findTour(active.id)!.steps.length-1)move(active.index+1)
 useEffect(()=>{
  if(active||saved.error||!shouldOfferIntro(progress))return
  const timer=window.setInterval(()=>{
   if(document.activeElement?.matches('input,textarea,select')||document.visibilityState!=='visible'||document.querySelector('dialog[open],[data-tour-blocked="true"]'))return
   // Offer only after mount/data initialization; do not interrupt Settings/import.
   if(document.querySelector('[data-tour-target="settings"]'))return
   try{const next=openTour(progress,'intro-blueprints');saveTourProgress(next);setProgress(next);setActive({id:'intro-blueprints',index:0,baseline:''})}catch{window.clearInterval(timer)/* Preserve storage; manual launch reports the error. */}
  },1500)
  return()=>window.clearInterval(timer)
 },[active,progress,saved.error])
 return {progress,active,step,start,move,finish,exit:()=>setActive(undefined)}
}
