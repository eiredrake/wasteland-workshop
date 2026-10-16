import { defaultActionConfiguration } from '../actions/ActionConfiguration'
import { procedureAction } from '../blueprints/ProcedureAction'
import { ingredientRequirement } from '../blueprints/IngredientRequirement'
import { createQueueSubmissionGuard } from '../builds/SubmissionGuard'
import { describe, expect, it } from 'vitest'
import { requireBatchQuantity } from './BatchQuantity'
import { enqueueBlueprintBatch, enqueueActionBatch } from '../builds/BatchQueueService'
import { allBlueprints } from '../blueprints/blueprints'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { actionCatalog } from '../actions/ActionCatalog'
import { addBuild, enqueueBlueprintBuild, editBuild, tickBuildQueue, toggleBuildStatus } from '../builds/BuildQueueService'
import { BUILD_QUEUE_KEY, loadBuildQueue, saveBuildQueue } from '../builds/BuildQueueRepository'
import { addBlueprintComponentCopies, addBlueprintComponents, addResources, replaceShoppingList, selectShoppingList } from '../shopping/ShoppingListService'
import { exportShoppingList, parseShoppingListImport, loadShoppingLists, saveShoppingLists } from '../shopping/ShoppingListRepository'
import { createBackup, restoreBackup } from '../backup/BackupRepository'
import type { ShoppingList } from '../shopping/ShoppingList'
const blueprint=allBlueprints.find(b=>b.name==='AA Blade')!, economics=resolveEconomicsSettings(), action=actionCatalog[0]
const components=blueprint.itemCraftings![0].craftingComponents
const empty:ShoppingList={id:'first',name:'First',items:[]}
function memory(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}}
const ids=()=>{let index=0;return()=>`batch-${++index}`}
describe('batch quantity hard limit',()=>{
 it.each([1,3,10])('accepts %s',quantity=>expect(requireBatchQuantity(quantity)).toBe(quantity))
 it.each([0,-1,1.5,11,100,NaN,Infinity,undefined,null,'3'])('rejects invalid quantity %s in every batch service',quantity=>{
  expect(()=>enqueueBlueprintBatch([],blueprint,economics,quantity)).toThrow('1 to 10')
  expect(()=>enqueueActionBatch([],action,'explore',{},economics,quantity)).toThrow('1 to 10')
  expect(()=>addBlueprintComponentCopies(empty,components,quantity)).toThrow('1 to 10')
 })
})
describe('independent Work Queue batches',()=>{
 it.each([1,3,10])('creates %s independent activities',quantity=>{
  const queue=enqueueBlueprintBatch([],blueprint,economics,quantity,1000)
  expect(queue).toHaveLength(quantity);expect(new Set(queue.map(a=>a.id)).size).toBe(quantity)
  expect(queue[0].status).toBe('Working');expect(queue.slice(1).every(a=>a.status==='Enqueued')).toBe(true)
  for(const a of queue)expect(a.timer.originalDurationMs).toBe(blueprint.itemCraftings![0].craftingTimeInMinute*60000)
  if(quantity>1){expect(queue[0].timer).not.toBe(queue[1].timer);expect(queue[0].recipe).not.toBe(queue[1].recipe);expect(queue[0].economicSnapshot).not.toBe(queue[1].economicSnapshot)}
 })
 it('retains single-item creation behavior',()=>{
  expect(enqueueBlueprintBatch([],blueprint,economics,1,1000,()=> 'one')).toEqual(enqueueBlueprintBuild([],blueprint,economics,1000,'one'))
 })
 it('appends consecutive stable activities after existing active work',()=>{
  const previous=addBuild(addBuild([],blueprint,economics,false,0,'a'),blueprint,economics,false,0,'b'),before=structuredClone(previous)
  const next=enqueueBlueprintBatch(previous,blueprint,economics,3,1000,ids())
  expect(next.map(a=>a.id)).toEqual(['a','b','batch-1','batch-2','batch-3']);expect(previous).toEqual(before)
 })
 it('keeps a batch together before completed history, including zero-duration recipes',()=>{
  const zero={...blueprint,itemCraftings:[{...blueprint.itemCraftings![0],craftingTimeInMinute:0}]}
  const history=enqueueBlueprintBuild([],zero,economics,0,'history')
  const next=enqueueBlueprintBatch(history,zero,economics,3,1000,ids())
  expect(next.map(a=>a.id)).toEqual(['batch-1','batch-2','batch-3','history'])
  expect(next[0].status).toBe('Completed');expect(next[1].status).toBe('Enqueued');expect(next[3]).toEqual(history[0])
 })
 it('keeps overrides, snapshots, timers and completion records independent',()=>{
  let queue=enqueueBlueprintBatch([],blueprint,economics,3,1000,ids())
  queue=editBuild(queue,'batch-2','Only second',{mindCostPerPoint:99,resourceValues:{3868:123}})
  expect(queue[0].overrides).toEqual({});expect(queue[2].overrides).toEqual({});expect(queue[1].overrides.resourceValues?.[3868]).toBe(123)
  const duration=queue[0].timer.originalDurationMs
  queue=tickBuildQueue(queue,1000+duration)
  queue=toggleBuildStatus(queue,'batch-2',2000+duration);queue=tickBuildQueue(queue,2000+2*duration)
  expect(queue[0].completedAt).toBe(1000+duration);expect(queue[1].completedAt).toBe(2000+2*duration)
  expect(queue[2].completedAt).toBeUndefined();expect(queue[2].timer.status).toBe('idle')
 })
 it.each([1,3,10])('supports %s Actions with independent execution snapshots',quantity=>{
  const queue=enqueueActionBatch([],action,'explore',{},economics,quantity)
  expect(queue).toHaveLength(quantity);expect(queue.every(a=>a.sourceType==='Action')).toBe(true)
  if(quantity>1){expect(queue[0].actionSnapshot).not.toBe(queue[1].actionSnapshot);expect(queue[0].actionSnapshot?.definition).not.toBe(queue[1].actionSnapshot?.definition)}
 })
 it('enforces Action session limits across the entire proposed batch without mutation',()=>{
  const limited=structuredClone(action);limited.options[0].sessionConstraints={maxRepetitions:2,description:'Two only'}
  const queue=addBuild([],blueprint,economics,false,0,'existing'),before=structuredClone(queue)
  expect(()=>enqueueActionBatch(queue,limited,'explore',{},economics,3,undefined,'session')).toThrow('Session repetition limit')
  expect(queue).toEqual(before)
 })
 it('rejects duplicate generated IDs without returning a partial batch',()=>{
  const queue=addBuild([],blueprint,economics,false,0,'existing'),before=structuredClone(queue)
  expect(()=>enqueueBlueprintBatch(queue,blueprint,economics,3,1000,()=> 'same')).toThrow('unique')
  expect(queue).toEqual(before)
 })
 it('preserves batch instances through queue persistence and full backup restore',()=>{
  const queue=enqueueBlueprintBatch([],blueprint,economics,3,Date.now(),ids()),store=memory()
  saveBuildQueue(queue,store);expect(JSON.parse(store.getItem(BUILD_QUEUE_KEY)!).builds).toHaveLength(3)
  const backup=createBackup(store),restored=memory();restoreBackup(backup,restored)
  const builds=loadBuildQueue(restored)
  expect(builds.map(a=>a.id)).toEqual(queue.map(a=>a.id));expect(builds[1].recipe).toEqual(queue[1].recipe)
 })
})
describe('batched Shopping List ingredients',()=>{
 it.each([1,3,10])('multiplies and aggregates components for %s copies',quantity=>{
  const single=addBlueprintComponents(empty,components),next=addBlueprintComponentCopies(empty,components,quantity)
  expect(next.items).toHaveLength(single.items.length)
  for(const item of single.items)expect(next.items.find(row=>row.resourceId===item.resourceId)?.quantity).toBe(item.quantity*quantity)
  expect(empty.items).toEqual([])
 })
 it('aggregates pre-existing and duplicate ingredients and reopens acquired demand',()=>{
  const c=components[0],list=addResources(empty,[{resourceId:c.component.id,name:c.component.name,quantity:4}]);list.items[0].acquired=true
  const next=addBlueprintComponentCopies(list,[c,c],3)
  expect(next.items).toHaveLength(1);expect(next.items[0].quantity).toBe(4+6*c.amount);expect(next.items[0].acquired).toBe(false)
  expect(list.items[0]).toMatchObject({quantity:4,acquired:true})
 })
 it('keeps all ingredients unchanged if a later requirement is invalid',()=>{
  const invalid={...components[0],amount:NaN};const before=structuredClone(empty)
  expect(()=>addBlueprintComponentCopies(empty,[components[0],invalid],3)).toThrow();expect(empty).toEqual(before)
 })
 it('retains destination selection, unrelated lists and import/export compatibility',()=>{
  const first={...empty,id:'a'},second={...empty,id:'b'},state={lists:[first,second],activeListId:'a'}
  const next=selectShoppingList(replaceShoppingList(state,addBlueprintComponentCopies(second,components,3)),'b')
  expect(next.activeListId).toBe('b');expect(next.lists[0]).toEqual(first)
  expect(parseShoppingListImport(exportShoppingList(next.lists[1])).items).toEqual(next.lists[1].items)
  const store=memory();saveShoppingLists(next,store);const restored=memory();restoreBackup(createBackup(store),restored)
  expect(loadShoppingLists(restored)).toEqual(next)
 })
})

it('guards repeated requests but permits a different explicit batch immediately',()=>{
 const guard=createQueueSubmissionGuard(()=>1000)
 expect(guard(()=>true,'one')).toBe(true)
 expect(guard(()=>true,'one')).toBe(false)
 expect(guard(()=>true,'three')).toBe(true)
 expect(guard(()=>true,'three')).toBe(false)
})

it('batches procedure Actions with independently cloned configuration',()=>{
 const source=allBlueprints.find(b=>b.id===5459)!,definition=procedureAction(source)
 const blueprint={...source,procedureConfiguration:defaultActionConfiguration(definition.options[0])}
 const queue=enqueueBlueprintBatch([],blueprint,economics,3,1000,ids())
 expect(queue).toHaveLength(3);expect(queue.every(a=>a.sourceType==='Action'&&a.sourceId==='procedure-5459')).toBe(true)
 expect(queue[0].actionSnapshot?.configuration).not.toBe(queue[1].actionSnapshot?.configuration)
})
it('retains Action insertion location beside completed history and round-trips mixed batches',()=>{
 const zero={...blueprint,itemCraftings:[{...blueprint.itemCraftings![0],craftingTimeInMinute:0}]}
 const history=enqueueBlueprintBuild([],zero,economics,1000,'history')
 const queue=enqueueActionBatch(history,action,'explore',{},economics,3,undefined,undefined,2000,ids())
 expect(queue.map(a=>a.id)).toEqual(['history','batch-1','batch-2','batch-3'])
 const store=memory();saveBuildQueue(queue,store);const restored=memory();restoreBackup(createBackup(store),restored)
 expect(loadBuildQueue(restored).map(a=>a.id)).toEqual(queue.map(a=>a.id))
 expect(loadBuildQueue(restored)[2].actionSnapshot).toEqual(queue[2].actionSnapshot)
})
it('scales ingredient choices without losing their selector identity or options',()=>{
 const source=allBlueprints.find(b=>b.itemCraftings?.[0]?.craftingComponents.some(c=>ingredientRequirement(c.component).kind==='choice'))!
 const components=source.itemCraftings![0].craftingComponents,next=addBlueprintComponentCopies(empty,components,3)
 const choice=components.find(c=>ingredientRequirement(c.component).kind==='choice')!
 const row=next.items.find(item=>item.resourceId===choice.component.id)!
 expect(row.kind).toBe('requirement');expect(row.requirement).toEqual(ingredientRequirement(choice.component))
 expect(row.quantity).toBe(3*choice.amount)
})
