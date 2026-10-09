import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { actionCatalog } from './ActionCatalog'
import type { ActionDefinition } from './Action'
import { addActionActivity, resolveAction } from './ActionService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { addBuild, adjustBuildTimerMinutes, editBuild, tickBuildQueue, toggleBuildStatus, startBuildAtTop, calculateBuildCost, restartInterruptedActivity } from '../builds/BuildQueueService'
import { loadBuildQueue, saveBuildQueue, BUILD_QUEUE_KEY } from '../builds/BuildQueueRepository'
import { allBlueprints } from '../blueprints/blueprints'
import { createBackup, restoreBackup, snapshotUserData } from '../backup/BackupRepository'
import { migrateBackup } from '../backup/Backup'
import WorkHistoryView from '../builds/WorkHistoryView'
import BuildQueueView from '../builds/BuildQueueView'
import BuildDetails from '../builds/BuildDetails'
import ActionDetails from './ActionDetails'
import ActionsView from './ActionsView'
const defaults=resolveEconomicsSettings(), definition=actionCatalog[0]
function memory(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}}
function queue(){return addActionActivity([],definition,'explore',{},defaults,undefined,undefined,1000,'action')}
function multiple():ActionDefinition {
 const action=structuredClone(definition);action.id='test-only';action.name='Test fixture (not a catalog entry)'
 action.options=[{...action.options[0],id:'one',name:'One',minutes:20,mind:0,outputs:[],effects:['Restore 5 Mind'],fields:[]},{...action.options[0],id:'two',name:'Two',minutes:10,mind:10,fields:[{id:'amount',label:'Quantity',type:'quantity',min:1,max:3,required:true},{id:'choice',label:'Choice',type:'select',choices:[{value:'x',label:'X'}]},{id:'resource',label:'Resource',type:'resource'},{id:'description',label:'Description',type:'text'}]}]
 return action
}
describe('data-driven Action execution',()=>{
 it('creates an Action Activity without a Blueprint ID using the existing timer',()=>{
  const activity=queue()[0];expect(activity.blueprintId).toBeUndefined();expect(activity.sourceType).toBe('Action')
  expect(activity.actionSnapshot?.option.equipmentUses).toEqual([{itemId:4370,name:'Vaguely Trustworthy Map Set',quantity:1}])
  expect(activity.timer).toMatchObject({status:'running',originalDurationMs:30*60000,endTimeMs:1801000})
  expect(activity.recipe.craftingMindCost).toBe(5);expect(activity.actionSnapshot?.option.outputs[0]).toEqual({name:'Forage card',quantity:1})
 })
 it('separates recovery benefits from costs and resolves option-specific values',()=>{
  const action=multiple(), recovery=resolveAction(action,'one'), option=resolveAction(action,'two',{amount:2,choice:'x',resource:3807,description:'Target'})
  expect(recovery.option.mind).toBe(0);expect(recovery.option.effects).toEqual(['Restore 5 Mind']);expect(recovery.option.outputs).toEqual([])
  expect(option.option.mind).toBe(10);expect(option.option.minutes).toBe(10)
  expect(()=>resolveAction(action,'one',{amount:2})).toThrow('does not belong')
 })
 it('validates generic configuration and refuses unverified definitions',()=>{
  const action=multiple();expect(()=>resolveAction(action,'two')).toThrow('Quantity')
  expect(()=>resolveAction(action,'two',{amount:99})).toThrow('Quantity')
  expect(()=>resolveAction(action,'two',{amount:1,choice:'bad'})).toThrow('Choice')
  expect(()=>resolveAction({...action,verified:false},'one')).toThrow('verification')
 })
 it('keeps execution and economic snapshots stable after catalog/settings changes',()=>{
  const action=structuredClone(definition),economics=structuredClone(defaults)
  const activity=addActionActivity([],action,'explore',{},economics,'Person',undefined,1000,'snapshot')[0]
  action.options[0].mind=99;economics.mindCostPerPoint=100
  expect(activity.actionSnapshot?.option.mind).toBe(5);expect(activity.economicSnapshot.mindCostPerPoint).toBe(.4)
  expect(calculateBuildCost(activity).productionCost).toBe(5)
 })
 it('checks explicit generic sessions, limits and stable selections',()=>{
  const action=multiple();action.options[1].sessionConstraints={maxMinutes:20,maxMind:20,maxRepetitions:2,sameField:'choice',description:'Test session limit'}
  expect(()=>resolveAction(action,'two',{amount:1})).toThrow('session ID')
  let records=addActionActivity([],action,'two',{amount:1,choice:'x'},defaults,undefined,'session',1000,'first')
  records=addActionActivity(records,action,'two',{amount:1,choice:'x'},defaults,undefined,'session',1000,'second')
  expect(()=>addActionActivity(records,action,'two',{amount:1,choice:'x'},defaults,undefined,'session',1000,'third')).toThrow('limit')
  expect(()=>addActionActivity(records,action,'two',{amount:1,choice:'x'},defaults,undefined,'other',1000,'fourth')).not.toThrow()
 })
 it('uses one queue for both sources, requiring explicit pause before switching',()=>{
  const blueprint=allBlueprints.find(b=>b.id===4403)!, records=addBuild(queue(),blueprint,defaults,false,1000,'blueprint')
  const before=structuredClone(records)
  expect(()=>startBuildAtTop(records,'blueprint',61000)).toThrow('Pause');expect(records).toEqual(before)
  const next=startBuildAtTop(toggleBuildStatus(records,'action',61000),'blueprint',61000)
  expect(next.filter(item=>item.status==='Working')).toHaveLength(1)
  expect(next.find(item=>item.id==='action')!.timer.remainingMs).toBe(29*60000)
 })
 it('completes to history without starting the next activity and supports existing adjustment',()=>{
  const records=addActionActivity(queue(),definition,'explore',{},defaults,undefined,undefined,1000,'next')
  const adjusted=adjustBuildTimerMinutes(records,'action',-1,61000)
  expect(adjusted[0].timer.remainingMs).toBe(28*60000)
  const completed=tickBuildQueue(adjusted,adjusted[0].timer.endTimeMs!)
  expect(completed[0].status).toBe('Completed');expect(completed[1].status).toBe('Enqueued')
 })
 it('allows historical notes without changing economics or recorded results',()=>{
  const completed=tickBuildQueue(queue(),99999999),before=structuredClone(completed[0])
  const changed=editBuild(completed,'action','New notes',{mindCostPerPoint:99})[0]
  expect(changed).toEqual({...before,notes:'New notes'})
 })
})
describe('Activity persistence and compatibility',()=>{
 it('restores both source snapshots and unresolved Action IDs',()=>{
  const storage=memory(),records=queue();records[0].sourceId='unavailable-action';records[0].actionSnapshot!.definition.id='unavailable-action'
  saveBuildQueue(records,storage)
  expect(loadBuildQueue(storage,1000)).toEqual(records)
  const backup=createBackup(storage,new Date(1000)),destination=memory();restoreBackup(backup,destination)
  expect(snapshotUserData(destination).buildQueue.builds[0].sourceId).toBe('unavailable-action')
  expect(snapshotUserData(destination).buildQueue.builds[0].actionSnapshot).toEqual(records[0].actionSnapshot)
 })
 it('migrates legacy queue state without changing order, timers, notes or costs',()=>{
  const blueprint=allBlueprints.find(b=>b.id===4403)!,records=addBuild([],blueprint,defaults,false,1000,'legacy')
  delete records[0].sourceType;delete records[0].sourceId;delete records[0].sourceVersion;records[0].notes='Preserve'
  const storage=memory();storage.setItem(BUILD_QUEUE_KEY,JSON.stringify({version:1,builds:records}))
  const restored=loadBuildQueue(storage,1000)
  expect(restored[0]).toEqual({...records[0],sourceType:'Blueprint',sourceId:blueprint.id})
  saveBuildQueue(restored,storage);expect(JSON.parse(storage.getItem(BUILD_QUEUE_KEY)!).version).toBe(2)
 })
 it('preserves configured positive resource IDs if the live catalog no longer contains them',()=>{
  const action=multiple(),storage=memory()
  const records=addActionActivity([],action,'two',{amount:1,resource:3807},defaults,undefined,undefined,1000,'unknown-resource')
  records[0].actionSnapshot!.configuration.resource=99999999
  saveBuildQueue(records,storage);expect(loadBuildQueue(storage,1000)[0].actionSnapshot!.configuration.resource).toBe(99999999)
  records[0].actionSnapshot!.configuration.resource=-1;saveBuildQueue(records,storage)
  expect(()=>loadBuildQueue(storage,1000)).toThrow()
 })
 it('migrates v2 backups and rejects malformed Action snapshots',()=>{
  const backup=createBackup(memory());expect(migrateBackup({...backup,schemaVersion:2}).schemaVersion).toBe(4)
  const storage=memory();saveBuildQueue(queue(),storage);const actionBackup=createBackup(storage,new Date(1000))
  actionBackup.data.buildQueue.builds[0].actionSnapshot!.option.mind=-10
  expect(()=>migrateBackup(actionBackup)).toThrow('snapshot')
 })
})
describe('shared themed queue, actions and history presentation',()=>{
 it('fixed options do not require a redundant selector, and actions have no ownership badges',()=>{
  const html=renderToStaticMarkup(createElement(ActionDetails,{definition,onAdd:vi.fn(),onClose:vi.fn()}))
  expect(html).not.toContain('<select');expect(html).toContain('Add to Queue');expect(html).toContain('Equipment uses')
  expect(html).not.toContain('Acquired');expect(html).not.toContain('Selling estimate')
  expect(renderToStaticMarkup(createElement(ActionsView,{onAdd:vi.fn()}))).toContain('Pending rules verification')
 })
 it('multiple options show generic selectors and fields',()=>{
  const action=multiple(),html=renderToStaticMarkup(createElement(ActionDetails,{definition:action,onAdd:vi.fn(),onClose:vi.fn()}))
  expect(html).toContain('<select');expect(html).toContain('Restore 5 Mind')
 })
 it('only Working rows start expanded, use the shared timer, and exclude completed records',()=>{
  let records=addActionActivity(queue(),definition,'explore',{},defaults,undefined,undefined,1000,'next')
  const html=renderToStaticMarkup(createElement(BuildQueueView,{builds:records,apply:vi.fn(),onTimer:vi.fn(),error:''}))
  expect(html.match(/<details open=""/g)).toHaveLength(1);expect(html).toContain('blueprint-craft-timer-compact')
  records=tickBuildQueue(records,99999999)
  const after=renderToStaticMarkup(createElement(BuildQueueView,{builds:records,apply:vi.fn(),onTimer:vi.fn(),error:''}))
  expect(after).not.toContain('build-card-completed')
 })
 it('history is newest-first, collapsed and keeps full snapshots with notes editing',()=>{
  let records=tickBuildQueue(queue(),2000000)
  records=addActionActivity(records,definition,'explore',{},defaults,undefined,undefined,3000000,'second')
  records=tickBuildQueue(records,5000000);records[0].blueprintName='Old';records[1].blueprintName='New'
  const html=renderToStaticMarkup(createElement(WorkHistoryView,{builds:records,apply:vi.fn(),error:''}))
  expect(html.indexOf('>New<')).toBeLessThan(html.indexOf('>Old<'));expect(html).not.toContain(' open=')
  expect(html).toContain('Forage card');expect(html).toContain('Details &amp; Notes')
  const details=renderToStaticMarkup(createElement(BuildDetails,{build:records[1],onSave:vi.fn(),onClose:vi.fn(),onTimer:vi.fn(),onToggle:vi.fn(),showTimer:false,blocked:false}))
  expect(details).toContain('Recorded Economics');expect(details).not.toContain('type="number"');expect(details).not.toContain('<fieldset disabled=""');expect(details).not.toContain('Selling estimate')
 })
})

describe('clarified Player Guide Actions',()=>{
 const find=(id:string)=>actionCatalog.find(action=>action.id===id)!
 it('records Repair as an effect with exclusions and restart rule',()=>{
  const repair=resolveAction(find('basic-artisan-repair'),'repair')
  expect(repair.option).toMatchObject({mind:1,minutes:10,outputs:[],interruptionRestarts:true})
  expect(repair.option.requirements.join(' ')).toContain('Necrology')
  expect(repair.definition.rules).toMatchObject({version:'2.3.2026',reference:'Page 46'})
 })
 it('resolves total herb gathering and enforces six-herb sessions',()=>{
  const action=find('basic-agricultural'),config={quantity:6,herb:'Basic Herb'}
  const record=addActionActivity([],action,'basic-herb',config,defaults,undefined,'farm',1000,'farm')[0]
  expect(record.actionSnapshot?.option).toMatchObject({mind:30,minutes:60,outputs:[{name:'Basic Herb',quantity:6}]})
  expect(()=>addActionActivity([record],action,'basic-herb',{quantity:1,herb:'Basic Herb'},defaults,undefined,'farm')).toThrow('limit')
 })
 it('keeps Foraging Cards individual without herb session restrictions',()=>{
  const result=resolveAction(find('proficient-agricultural'),'foraging-card')
  expect(result.option).toMatchObject({mind:0,resolve:1,minutes:20,outputs:[{name:'Foraging Card',quantity:1}]})
  expect(result.option.sessionConstraints).toBeUndefined()
 })
 it('preserves a selected Named Herb and rejects switching within a session',()=>{
  const action=find('master-agricultural')
  const records=addActionActivity([],action,'named-herb',{quantity:2,herb:'Anise'},defaults,undefined,'season',1000,'named')
  expect(records[0].actionSnapshot?.option.outputs).toEqual([{name:'Anise',quantity:2}])
  expect(()=>addActionActivity(records,action,'named-herb',{quantity:1,herb:'Rosemary'},defaults,undefined,'season')).toThrow('same selection')
 })
 it('meditation restores Mind separately with optional Resolve expenditure',()=>{
  expect(resolveAction(find('devoted-meditation'),'meditate').option).toMatchObject({mind:0,resolve:0,minutes:20,effects:['Restore 5 Mind']})
  expect(resolveAction(find('devoted-meditation'),'meditate-fracture').option).toMatchObject({mind:0,resolve:1,effects:['Restore 5 Mind','Remove 1 Fracture from self']})
 })
 it('additional healing Mind does not extend treatment; Mangle scales time and cost',()=>{
  expect(resolveAction(find('basic-medical-healing'),'heal',{additionalMind:3},'Patient').option).toMatchObject({mind:4,minutes:10})
  for(const [limbs,mind,minutes] of [[1,5,10],[2,10,12],[3,15,14]])expect(resolveAction(find('proficient-medical-mangle'),'mangle',{limbs}).option).toMatchObject({mind,minutes})
 })
 it('medical information and temporary benefits do not produce items',()=>{
  for(const id of ['basic-medical-assessment','master-medical-first-aid','master-medical-checkup'])expect(find(id).options[0].outputs).toEqual([])
  expect(find('master-medical-first-aid').options[0].effects.join(' ')).toContain('six hours')
 })
 it('an interruption resets the entire gathering and pauses for explicit restart',()=>{
  const records=addActionActivity([],find('basic-agricultural'),'basic-herb',{quantity:3,herb:'Basic Herb'},defaults,undefined,'farm',1000,'gather')
  const paused=restartInterruptedActivity(tickBuildQueue(records,61000),'gather',61000)
  expect(paused[0]).toMatchObject({status:'Paused',timer:{remainingMs:1800000,originalDurationMs:1800000}})
  expect(toggleBuildStatus(paused,'gather',62000)[0].timer.endTimeMs).toBe(1862000)
 })
 it('backup preserves resolved configured costs and the source configuration',()=>{
  const storage=memory(),records=addActionActivity([],find('proficient-medical-mangle'),'mangle',{limbs:3},defaults,'Patient',undefined,1000,'limbs')
  saveBuildQueue(records,storage)
  const restored=loadBuildQueue(storage,1000)[0]
  expect(restored.actionSnapshot).toMatchObject({configuration:{limbs:3},target:'Patient',option:{mind:15,minutes:14}})
 })
})

describe('confirmed Helscape Mine',()=>{
 it('offers one scrap per fixed ten minutes at tier-specific Mind costs',()=>{
  const mine=actionCatalog.find(action=>action.id==='helscape-mine')!
  expect(mine).toMatchObject({verified:true,skill:'Basic Foraging',prerequisites:['Basic Foraging'],facilities:['Helscape Mine'],tools:[]})
  for(const [id,mind,itemId,name] of [['basic-scrap',5,3866,'Basic Scrap'],['uncommon-scrap',10,3867,'Uncommon Scrap'],['rare-scrap',15,3868,'Rare Scrap']] as const){
   const execution=resolveAction(mine,id)
   expect(execution.option).toMatchObject({mind,minutes:10,resolve:0,inputs:[],equipmentUses:[],outputs:[{itemId,name,quantity:1}]})
   expect(execution.option.sessionConstraints).toBeUndefined()
   const records=addActionActivity([],mine,id,{},defaults,undefined,undefined,1000,id)
   expect(records[0].blueprintId).toBeUndefined()
   expect(records[0].timer).toMatchObject({originalDurationMs:600000,status:'running'})
   const storage=memory();saveBuildQueue(records,storage)
   expect(loadBuildQueue(storage,1000)[0].actionSnapshot).toEqual(execution)
  }
 })
})

it('Basic Medical heals ten Body per total Mind with one treatment timer',()=>{
 const healing=actionCatalog.find(action=>action.id==='basic-medical-healing')!
 for(const [additionalMind,totalMind,body] of Array.from({length:10},(_,additionalMind)=>[additionalMind,additionalMind+1,(additionalMind+1)*10])){
  const execution=resolveAction(healing,'heal',{additionalMind},'Patient')
  expect(execution.option).toMatchObject({mind:totalMind,minutes:10,effects:['Restore '+body+' Body.']})
  const records=addActionActivity([],healing,'heal',{additionalMind},defaults,'Patient',undefined,1000,'heal')
  expect(records[0].recipe.craftingMindCost).toBe(totalMind)
  expect(records[0].timer.originalDurationMs).toBe(600000)
  const storage=memory();saveBuildQueue(records,storage)
  expect(loadBuildQueue(storage,1000)[0].actionSnapshot?.option.effects).toEqual(['Restore '+body+' Body.'])
 }
})


it('Basic Medical caps healing at 100 Body and rejects invalid Mind amounts',()=>{
 const healing=actionCatalog.find(action=>action.id==='basic-medical-healing')!
 expect(healing.version).toBe(2)
 expect(resolveAction(healing,'heal',{},'Patient').option).toMatchObject({mind:1,minutes:10,effects:['Restore 10 Body.']})
 expect(resolveAction(healing,'heal',{additionalMind:9},'Patient').option).toMatchObject({mind:10,minutes:10,effects:['Restore 100 Body.']})
 for(const additionalMind of [-1,10,100,0.5]) {
  expect(()=>resolveAction(healing,'heal',{additionalMind},'Patient')).toThrow('Invalid Additional Mind')
  expect(()=>addActionActivity([],healing,'heal',{additionalMind},defaults,'Patient')).toThrow('Invalid Additional Mind')
 }
})
