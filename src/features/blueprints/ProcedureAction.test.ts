import { loadBuildQueue, saveBuildQueue } from '../builds/BuildQueueRepository'
import { blueprintShareCard } from './BlueprintShareCard'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { describe, it, expect } from 'vitest'
import { allBlueprints, masterBlueprints } from './blueprints'
import { canQueueProcedure, isProcedureBlueprint, pendingProcedureOutputs, procedureAction } from './ProcedureAction'
import { defaultActionConfiguration } from '../actions/ActionConfiguration'
import { isActionExecution, resolveAction } from '../actions/ActionService'
import { enqueueBlueprintBuild, toggleBuildStatus } from '../builds/BuildQueueService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { setCollectionBlueprintStatus } from './BlueprintCollectionService'
const procedures = allBlueprints.filter(isProcedureBlueprint)
const transfusion = procedures.find(b => b.id === 5459)!
describe('Printable procedures', () => {
 it('includes all four printed procedure categories in the master and collection catalog', () => {
  expect(procedures).toHaveLength(48)
  expect(procedures.filter(canQueueProcedure)).toHaveLength(45)
  for (const blueprint of procedures) {
   expect(masterBlueprints).toContain(blueprint)
   const collection = setCollectionBlueprintStatus({id:'test',name:'Procedures',entries:[]},blueprint.id,'acquired')
   expect(masterBlueprints.find(b=>b.id===collection.entries[0].blueprintId)).toBe(blueprint)
  }
 })
 it('defaults transfusion to 20 minutes and one Resolve, with no manufactured output', () => {
  const definition = procedureAction(transfusion)
  const execution = resolveAction(definition,'perform',defaultActionConfiguration(definition.options[0]))
  expect(execution.option).toMatchObject({minutes:20,mind:0,resolve:1,outputs:[]})
  expect(isActionExecution(execution)).toBe(true)
 })
 it('queues every procedure as a valid Action snapshot and starts an empty queue', () => {
  for(const blueprint of procedures.filter(canQueueProcedure)){
   const definition = procedureAction(blueprint)
   const configuration = defaultActionConfiguration(definition.options[0])
   configuration.minutes ??= 30
   const [activity] = enqueueBlueprintBuild([],{...blueprint,procedureConfiguration:configuration},resolveEconomicsSettings(),1000,'procedure')
   expect(activity.sourceType).toBe('Action')
   expect(activity.status).toBe('Working')
   expect(activity.recipe.craftingFinalProducts).toEqual([])
   expect(isActionExecution(activity.actionSnapshot)).toBe(true)
  }
 })
 it('preserves selected totals and does not pause active work when appending', () => {
  const queue = enqueueBlueprintBuild([],transfusion,resolveEconomicsSettings(),1000,'first')
  const next = enqueueBlueprintBuild(queue,{...transfusion,procedureConfiguration:{minutes:30,mind:4,resolve:2}},resolveEconomicsSettings(),2000,'second')
  expect(next[0]).toEqual(queue[0]);expect(next[1].status).toBe('Enqueued')
  expect(next[1].actionSnapshot?.option).toMatchObject({minutes:30,mind:4,resolve:2})
  expect(toggleBuildStatus(next,'first',3000)[0].timer.remainingMs).toBe(1198000)
 })
 it('normalizes trailing whitespace in procedure headers', () => {
  const prep = procedures.find(b=>b.name==='Prep Time')!
  expect(procedureAction(prep).category).toBe('Dubious Procedure')
 })
 it('requires explicit duration when it depends on another project or printed mechanics', () => {
  for(const id of [6119,5932,5953,6223,5986]) {
   const blueprint = procedures.find(b=>b.id===id)!
   const definition = procedureAction(blueprint)
   const config = defaultActionConfiguration(definition.options[0])
   expect(config.minutes).toBeUndefined()
   expect(()=>resolveAction(definition,'perform',config)).toThrow('Enter Duration (minutes).')
   expect(()=>enqueueBlueprintBuild([],blueprint,resolveEconomicsSettings())).toThrow('Enter Duration (minutes).')
   const execution = resolveAction(definition,'perform',{...config,minutes:35})
   expect(execution.option.minutes).toBe(35)
   expect(isActionExecution(execution)).toBe(true)
  }
 })
 it('preserves consumables and modifier instructions without silently changing another project', () => {
  const prep = procedureAction(procedures.find(b=>b.id===5957)!)
  expect(prep.options[0].requirements).toContain('Equipment / consumables: 4 Basic Scrap and 1 Hard Metal (Expended)')
  const modifier = procedureAction(procedures.find(b=>b.id===5932)!)
  expect(modifier.options[0].requirements.join(' ')).toContain('does not automatically change another queued activity')
 })
 it('shows output-producing procedures but blocks incomplete queue execution', () => {
  for(const id of Object.keys(pendingProcedureOutputs).map(Number)){
   const blueprint = procedures.find(b=>b.id===id)!
   expect(masterBlueprints).toContain(blueprint)
   expect(canQueueProcedure(blueprint)).toBe(false)
   expect(()=>enqueueBlueprintBuild([],blueprint,resolveEconomicsSettings())).toThrow('inputs and outputs reviewed')
  }
 })
 it('leaves only the 16 taxonomy-output recipes excluded from the master list', () => {
  const remaining = allBlueprints.filter(b=>!masterBlueprints.includes(b))
  expect(remaining).toHaveLength(16)
  for(const blueprint of remaining)expect(blueprint.itemCraftings?.[0]?.craftingFinalProducts[0]?.finalProduct.kind).toBe('taxonomy')
 })
 it('retains procedure requirements and mechanics in the share print', () => {
  const share = blueprintShareCard(transfusion,new DefaultCostCalculator(resolveEconomicsSettings()))
  expect(share.sections).toContainEqual({label:'Equipment / Consumables',text:'Necrology Station'})
  expect(share.sections).toContainEqual({label:'Procedure Mechanics',text:transfusion.metadata!.mechanics})
 })
 it('round-trips procedure snapshots through saved queue validation, including prior versions', () => {
  const values = new Map<string,string>()
  const storage = { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{values.set(key,value)} }
  const queue = enqueueBlueprintBuild([],transfusion,resolveEconomicsSettings(),1000,'saved')
  queue[0].actionSnapshot!.definition.version = 1
  queue[0].sourceVersion = 1
  saveBuildQueue(queue,storage)
  expect(loadBuildQueue(storage,1000)).toEqual(queue)
 })
 it('keeps ordinary item production as a Blueprint', () => {
  const blueprint = masterBlueprints.find(b=>b.name==='Sosweet Smashstick')!
  expect(enqueueBlueprintBuild([],blueprint,resolveEconomicsSettings(),1000,'craft')[0].sourceType).toBe('Blueprint')
 })
})
