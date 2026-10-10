import { describe, it, expect } from 'vitest'
import { allBlueprints, masterBlueprints } from './blueprints'
import { isProcedureBlueprint, procedureAction } from './ProcedureAction'
import { defaultActionConfiguration } from '../actions/ActionConfiguration'
import { isActionExecution, resolveAction } from '../actions/ActionService'
import { enqueueBlueprintBuild, toggleBuildStatus } from '../builds/BuildQueueService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { setCollectionBlueprintStatus } from './BlueprintCollectionService'
const procedures = allBlueprints.filter(isProcedureBlueprint)
const transfusion = procedures.find(b => b.id === 5459)!
describe('Printable procedures', () => {
 it('includes all 25 Benedictions and the transfusion in the master and collection catalog', () => {
  expect(procedures).toHaveLength(26)
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
  for(const blueprint of procedures){
   const [activity] = enqueueBlueprintBuild([],blueprint,resolveEconomicsSettings(),1000,'procedure')
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
 it('keeps ordinary item production as a Blueprint', () => {
  const blueprint = masterBlueprints.find(b=>b.name==='Sosweet Smashstick')!
  expect(enqueueBlueprintBuild([],blueprint,resolveEconomicsSettings(),1000,'craft')[0].sourceType).toBe('Blueprint')
 })
})
