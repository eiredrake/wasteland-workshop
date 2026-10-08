import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { allBlueprints } from './blueprints'
import { blueprintUsageRestrictions } from './UsageRestrictions'
import BlueprintUsageBadges from '../../components/BlueprintUsageBadges/BlueprintUsageBadges'
import BlueprintSearch from './BlueprintSearch'
import WorkshopView from './WorkshopView'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { createIdleCraftTimer } from '../timer/CraftTimerState'
const brew = allBlueprints.find(b=>b.id===4403)!
function withRequirement(text:string) {
 const blueprint = structuredClone(brew)
 blueprint.itemCraftings![0].craftingFinalProducts[0].finalProduct.metadata!.requirementsToUse = text
 return blueprint
}
describe('compact usage restrictions', () => {
 it('extracts actual lineage and strain requirements in the bundled catalog', () => {
  expect(blueprintUsageRestrictions(brew)).toEqual([{type:'Lineage',value:'Townie',source:'Townie Lineage'}])
  const strain = allBlueprints.find(b=>b.itemCraftings?.some(r=>r.craftingFinalProducts.some(p=>p.finalProduct.metadata?.requirementsToUse==='Strain: Iron or Unstable')))!
  expect(blueprintUsageRestrictions(strain)).toEqual([{type:'Strain',value:'Iron or Unstable',source:'Strain: Iron or Unstable'}])
 })
 it('handles case, whitespace, multiple explicit clauses, and deduplication', () => {
  const blueprint = withRequirement('  townie Lineage; Strain: Iron or Unstable. ')
  blueprint.metadata = {...blueprint.metadata!,requirementsToUse:'Townie Lineage'}
  expect(blueprintUsageRestrictions(blueprint).map(r=>[r.type,r.value])).toEqual([['Lineage','Townie'],['Strain','Iron or Unstable']])
 })
 it.each(['Any Lineage','Lore: Lineage','Cannot use Townie Lineage','Basic Artisan and Townie Lineage','None','Master Medical','Strain: not Iron'])('does not infer restrictions from %s', text => {
  expect(blueprintUsageRestrictions(withRequirement(text))).toEqual([])
 })
 it('does not parse mechanics as restrictions or mutate source data', () => {
  const blueprint = withRequirement('None'), before = structuredClone(blueprint)
  blueprint.itemCraftings![0].craftingFinalProducts[0].finalProduct.metadata!.mechanics = 'Townie Lineage only'
  const changed = structuredClone(blueprint)
  expect(blueprintUsageRestrictions(blueprint)).toEqual([]); expect(blueprint).toEqual(changed)
  expect(before.itemCraftings![0].craftingFinalProducts[0].finalProduct.metadata!.requirementsToUse).toBe('None')
 })
 it('shows labeled badges and omits unrestricted badge containers', () => {
  expect(renderToStaticMarkup(createElement(BlueprintUsageBadges,{blueprint:brew}))).toContain('Lineage: Townie')
  expect(renderToStaticMarkup(createElement(BlueprintUsageBadges,{blueprint:withRequirement('None')}))).toBe('')
 })
 it('shows badges in both catalog and collection name cells', () => {
  const props = {calculator:new DefaultCostCalculator(),defaultMarkupPercent:25,craftTimer:createIdleCraftTimer(),activeCollection:{id:'test',name:'Test',entries:[{blueprintId:brew.id,status:'acquired' as const}]},shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()},onUpdateCollectionEntry:vi.fn(),onCraftBlueprint:vi.fn(),onAddBuild:vi.fn(),onOpenCraftTimer:vi.fn()}
  expect(renderToStaticMarkup(createElement(BlueprintSearch,props))).toContain('Lineage: Townie')
  expect(renderToStaticMarkup(createElement(WorkshopView,props))).toContain('Lineage: Townie')
 })
})
