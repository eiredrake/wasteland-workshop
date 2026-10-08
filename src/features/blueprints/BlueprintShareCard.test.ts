import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { blueprintShareCard } from './BlueprintShareCard'
import { testBlueprints } from './testBlueprints'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'
import BlueprintDetails from './BlueprintDetails'
import SharePreview from '../../components/SharePreview/SharePreview'
import { createIdleCraftTimer } from '../timer/CraftTimerState'
const calculator = new DefaultCostCalculator()
describe('blueprint share content', () => {
  it('omits absent and inapplicable values', () => {
    expect(blueprintShareCard({ id: 1, name: 'Empty', kind: 'blueprint' }, calculator).sections).toEqual([])
  })
  it('preserves populated data, multiline text, ingredient choices and zero values without mutation', () => {
    const blueprint = structuredClone(testBlueprints[0])
    const crafting = blueprint.itemCraftings![0]
    crafting.craftingComponents[0].component.name = 'Anise or Geranium'
    crafting.craftingMindCost = 0
    crafting.craftingFinalProducts[0].finalProduct.metadata = { ...blueprint.metadata! }
    crafting.craftingFinalProducts[0].finalProduct.metadata!.mechanics = 'First line\n\nSecond line'
    crafting.craftingFinalProducts[0].finalProduct.metadata!.uses = '3'
    crafting.craftingFinalProducts[0].finalProduct.metadata!.requirementsToUse = 'Artisan'
    crafting.craftingFinalProducts[0].finalProduct.lifetimeAmount = 24
    crafting.craftingFinalProducts[0].finalProduct.lifetimeUnit = 'month'
    blueprint.metadata!.notes = 'Note one\nNote two'
    const before = JSON.stringify(blueprint)
    const card = blueprintShareCard(blueprint, calculator)
    expect(card.sections).toContainEqual({label:'Mind Cost',text:'0'})
    expect(card.sections).toContainEqual({label:'Item Mechanics',text:'First line\n\nSecond line'})
    expect(card.sections).toContainEqual({label:'Special Notes',text:'Note one\nNote two'})
    expect(card.sections.find(s => s.label === 'Components')!.text).toContain('Anise or Geranium')
    expect(card.sections).toEqual(expect.arrayContaining([{label:'Uses',text:'3'},{label:'Requirements to Use',text:'Artisan'},{label:'Expiration',text:'24 months'}]))
    expect(JSON.stringify(blueprint)).toBe(before)
  })
  it('omits N/A metadata but preserves generic selectors and meaningful zero uses', () => {
    const blueprint = structuredClone(testBlueprints[0])
    const crafting = blueprint.itemCraftings![0]
    crafting.craftingComponents[0].component.name = 'Any Herb'
    crafting.craftingFinalProducts[0].finalProduct.metadata = { ...blueprint.metadata!, mechanics:'N/A', uses:'0', requirementsToUse:'' }
    blueprint.metadata!.notes = 'Not Applicable'
    const card = blueprintShareCard(blueprint, calculator)
    expect(card.sections.find(s => s.label === 'Components')!.text).toContain('Any Herb')
    expect(card.sections).toContainEqual({label:'Uses',text:'0'})
    expect(card.sections.some(s => ['Item Mechanics','Special Notes','Requirements to Use'].includes(s.label))).toBe(false)
  })
  it('uses existing economics including effective overrides', () => {
    const blueprint = testBlueprints.find(b => b.id === 5890)!
    const custom = new DefaultCostCalculator()
    vi.spyOn(custom, 'getEffectiveResourceValue').mockReturnValue(17)
    const expected = calculateBlueprintCost(blueprint.itemCraftings![0], custom).productionCost!
    expect(blueprintShareCard(blueprint,custom).sections).toContainEqual({label:'Production Cost',text:expected.toLocaleString(undefined,{maximumFractionDigits:4})+'cr'})
  })
  it.each(['catalog','collection'] as const)('offers Share Print in %s without membership or state changes', mode => {
    const mutation = vi.fn()
    for (const activeCollection of [undefined, {id:'c',name:'Collection',entries:[{blueprintId:testBlueprints[0].id,status:'acquired' as const}]}]) {
      const html = renderToStaticMarkup(createElement(BlueprintDetails, {blueprint:testBlueprints[0],mode,calculator,defaultMarkupPercent:25,activeCollection,craftTimer:createIdleCraftTimer(),onUpdateCollectionEntry:mutation,onCraftBlueprint:mutation,onAddBuild:mutation,onOpenCraftTimer:mutation,shopping:{lists:[],onAddComponents:mutation,onOpenLists:mutation}}))
      expect(html).toContain('Share Print')
    }
    expect(mutation).not.toHaveBeenCalled()
  })
  it('provides an accessible preview and close control', () => {
    const html = renderToStaticMarkup(createElement(SharePreview,{card:blueprintShareCard(testBlueprints[0],calculator),onClose:vi.fn()}))
    expect(html).toContain('<dialog'); expect(html).toContain('>Close</button>')
    expect(html).toContain('>Share</button>'); expect(html).toContain('>Save Image</button>')
  })
})

