import { describe,expect,it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { openTour,completeTour,shouldOfferIntro,validateTourProgress,TOUR_STORAGE_KEY } from './TourProgress'
import { loadTourProgress,saveTourProgress } from './TourRepository'
import { guidedTours,confirmedAction } from './TourRegistry'
import { createBackup,restoreBackup } from '../backup/BackupRepository'
import { parseBackup } from '../backup/Backup'
import GuidedTour from '../../components/GuidedTour/GuidedTour'
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}}}
describe('guided tours',()=>{
 it('offers only an unviewed introduction, including after deliberate skip or exit',()=>{
  expect(shouldOfferIntro({})).toBe(true)
  expect(shouldOfferIntro(openTour({},'warehouse'))).toBe(true)
  expect(shouldOfferIntro(openTour({},'intro-blueprints'))).toBe(false)
 })
 it('preserves completion and first timestamps on replay and interruption',()=>{
  const complete=completeTour({},'intro-blueprints','2026-10-08T20:00:00Z')
  const replay=openTour(complete,'intro-blueprints','2026-10-08T21:00:00Z')
  expect(replay['intro-blueprints']).toMatchObject({viewed:true,completed:true,firstViewedAt:'2026-10-08T20:00:00Z',completedAt:'2026-10-08T20:00:00Z',lastOpenedAt:'2026-10-08T21:00:00Z'})
  expect(shouldOfferIntro(replay)).toBe(false)
 })
 it('persists independent viewed and completed states plus unknown future IDs',()=>{
  const store=memory(),progress=openTour(completeTour({},'warehouse'),'future-tour')
  saveTourProgress(progress,store);expect(loadTourProgress(store)).toEqual(progress)
  expect(progress['future-tour'].completed).toBe(false)
 })
 it.each([null,[],{'bad id':{viewed:true,completed:false}},{x:{viewed:false,completed:true}},{x:{viewed:true,completed:false,lastOpenedAt:'nonsense'}},JSON.parse('{"__proto__":{"viewed":true,"completed":false}}')])('rejects unsafe or malformed progress %j',value=>expect(()=>validateTourProgress(value)).toThrow())
 it('does not overwrite unreadable saved progress',()=>{
  const store=memory();store.setItem(TOUR_STORAGE_KEY,'{bad');expect(()=>loadTourProgress(store)).toThrow();expect(store.getItem(TOUR_STORAGE_KEY)).toBe('{bad')
 })
 it('round trips all progress with new backup replacement semantics',()=>{
  const source=memory(),destination=memory(),progress=openTour(completeTour({},'warehouse'),'actions')
  saveTourProgress(progress,source);saveTourProgress(completeTour({},'work-queue'),destination)
  const backup=createBackup(source);expect(backup.schemaVersion).toBe(4)
  restoreBackup(parseBackup(JSON.stringify(backup)),destination)
  expect(loadTourProgress(destination)).toEqual(progress)
 })
 it.each([1,2,3])('imports v%s without losing local completion or surprising onboarding',version=>{
  const source=createBackup(memory()),destination=memory();saveTourProgress(completeTour({},'warehouse'),destination)
  const old=JSON.parse(JSON.stringify(source));old.schemaVersion=version;delete old.data.guidedTours;if(version===1)delete old.data.blueprintReadHistory
  restoreBackup(parseBackup(JSON.stringify(old)),destination)
  expect(loadTourProgress(destination).warehouse.completed).toBe(true)
  expect(shouldOfferIntro(loadTourProgress(destination))).toBe(false)
 })
 it('suppresses intro after importing an old backup on a new device',()=>{
  const backup=JSON.parse(JSON.stringify(createBackup(memory())));backup.schemaVersion=3;delete backup.data.guidedTours
  const destination=memory();restoreBackup(parseBackup(JSON.stringify(backup)),destination);expect(shouldOfferIntro(loadTourProgress(destination))).toBe(false)
 })
 it('keeps progress if a restore write fails',()=>{
  const destination=memory(),before=completeTour({},'warehouse');saveTourProgress(before,destination)
  let failed=false
  const failing={...destination,setItem:(key:string,value:string)=>{if(key===TOUR_STORAGE_KEY&&!failed){failed=true;throw new Error('Quota')}destination.setItem(key,value)}}
  expect(()=>restoreBackup(createBackup(memory()),failing)).toThrow();expect(loadTourProgress(destination)).toEqual(before)
 })
 it('has ten independently replayable tours with stable unique step IDs',()=>{
  expect(guidedTours).toHaveLength(10);expect(new Set(guidedTours.map(t=>t.id)).size).toBe(10)
  for(const tour of guidedTours){expect(tour.steps.length).toBeGreaterThan(1);expect(new Set(tour.steps.map(s=>s.id)).size).toBe(tour.steps.length);expect(tour.steps.every(s=>s.body&&s.title)).toBe(true)}
 })
 it('requires confirmed actions; removal and revisiting a queue step do not count as additions',()=>{
  const step=guidedTours[0].steps.find(s=>s.condition==='queued')!
  expect(confirmedAction(step,'["a"]','["a"]')).toBe(false)
  expect(confirmedAction(step,'["a"]','[]')).toBe(false)
  expect(confirmedAction(step,'["a"]','["a","b"]')).toBe(true)
  expect(confirmedAction(guidedTours[0].steps[1],'a','b')).toBe(false)
 })
 it('offers Skip/Exit initially and Finish only on the final step',()=>{
  const first=renderToStaticMarkup(<GuidedTour active={{id:'intro-blueprints',index:0,baseline:''}} onMove={()=>{}} onExit={()=>{}} onFinish={()=>{}} canUseExisting={false}/>)
  expect(first).toContain('Skip Tour');expect(first).toContain('Exit Tour');expect(first).toContain('Start Tour');expect(first).not.toContain('Finish Tour')
  const final=renderToStaticMarkup(<GuidedTour active={{id:'intro-blueprints',index:9,baseline:''}} onMove={()=>{}} onExit={()=>{}} onFinish={()=>{}} canUseExisting={false}/>)
  expect(final).toContain('Finish Tour');expect(final).not.toContain('Skip Tour')
 })
})
