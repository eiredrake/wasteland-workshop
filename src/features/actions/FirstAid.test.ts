import { describe, expect, it } from 'vitest'
import { actionCatalog } from './ActionCatalog'
import { addActionActivity } from './ActionService'
import { tickBuildQueue } from '../builds/BuildQueueService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'

const firstAid=actionCatalog.find(action=>action.id==='first-aid')!
describe('First Aid treatment timing',()=>{
 it('runs First Aid for exactly ten seconds and retains its use and interruption limitations',()=>{
  const queue=addActionActivity([],firstAid,'first-aid',{},resolveEconomicsSettings(),undefined,undefined,1000,'aid')
  expect(queue[0].timer.originalDurationMs).toBe(10000)
  expect(tickBuildQueue(queue,10999)[0].status).toBe('Working')
  const completed=tickBuildQueue(queue,11000)[0]
  expect(completed.status).toBe('Completed')
  expect(completed.recipe.craftingMindCost).toBe(0)
  expect(completed.recipe.craftingResolveCost).toBe(0)
  expect(completed.actionSnapshot?.option.effects).toContain('Restore 5 Body to another character.')
  expect(completed.actionSnapshot?.option.requirements.join(' ')).toContain('the use is spent and no Body is restored')
  expect(completed.actionSnapshot?.option.interruptionRestarts).not.toBe(true)
  expect(completed.actionSnapshot?.definition.rules.reference).toBe('Page 39')
 })
 it('runs Stabilize for two minutes without spending a First Aid use',()=>{
  const queue=addActionActivity([],firstAid,'stabilize',{},resolveEconomicsSettings(),undefined,undefined,1000,'stabilize')
  expect(queue[0].timer.originalDurationMs).toBe(120000)
  expect(tickBuildQueue(queue,120999)[0].status).toBe('Working')
  const completed=tickBuildQueue(queue,121000)[0]
  expect(completed.status).toBe('Completed')
  expect(completed.actionSnapshot?.option.effects).toContain('Restore 1 Body to another character without expending a First Aid use.')
  expect(completed.actionSnapshot?.option.requirements).toContain('Requires at least one available First Aid use.')
  expect(completed.actionSnapshot?.option.requirements).toContain('Does not stop the Target’s Bleed Out timer.')
 })
})
