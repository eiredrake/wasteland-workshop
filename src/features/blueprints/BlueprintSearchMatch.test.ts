import { describe, expect, it } from 'vitest'
import { matchesBlueprintSearch } from './BlueprintSearchMatch'
import { allBlueprints } from './blueprints'
import type { Blueprint } from './Blueprint'
describe('shared catalog and collection search', () => {
  const brew = allBlueprints.find(b => b.id === 4403)!
  it.each(['Townie Lineage','TOWNIE','ownie','  townie  '])('matches crafted-product Requirements to Use: %s',query => {
    expect(matchesBlueprintSearch(brew,query,[brew.name])).toBe(true)
  })
  it('finds actual lineage-restricted blueprints without inferred lineage fields', () => {
    const matches = allBlueprints.filter(b => matchesBlueprintSearch(b,'gorger',[b.name]))
    expect(matches.map(b=>b.id)).toContain(4439)
    expect(matches.map(b=>b.id)).toContain(4422)
    expect(matchesBlueprintSearch(brew,'gorger',[brew.name])).toBe(false)
  })
  it('supports blueprint-level requirements and missing metadata', () => {
    const blueprint: Blueprint = { id:1,name:'Example',kind:'blueprint',metadata:{...brew.metadata!,requirementsToUse:'Master Artisan'} }
    expect(matchesBlueprintSearch(blueprint,'ARTISAN',['Example'])).toBe(true)
    expect(matchesBlueprintSearch({id:2,name:'Empty',kind:'blueprint'},'townie',['Empty'])).toBe(false)
  })
  it('preserves existing fields including collection status, partial matches and empty search', () => {
    expect(matchesBlueprintSearch(brew,'invigor',['Angry Apple Invigorating Brew'])).toBe(true)
    expect(matchesBlueprintSearch(brew,'ACQUI',['To Acquire'])).toBe(true)
    expect(matchesBlueprintSearch(brew,'artisan',['Master Artisan'])).toBe(true)
    expect(matchesBlueprintSearch(brew,'2026',['Oct 6, 2026'])).toBe(true)
    expect(matchesBlueprintSearch(brew,'   ',[brew.name])).toBe(true)
  })
  it('searches all output requirements without altering blueprint data', () => {
    const blueprint = structuredClone(brew), before = structuredClone(brew)
    const output = structuredClone(blueprint.itemCraftings![0].craftingFinalProducts[0])
    output.finalProduct.metadata!.requirementsToUse = 'Unique second output restriction'
    blueprint.itemCraftings![0].craftingFinalProducts.push(output)
    expect(matchesBlueprintSearch(blueprint,'second output',[blueprint.name])).toBe(true)
    expect(brew).toEqual(before)
    expect(blueprint.itemCraftings![0].craftingFinalProducts).toHaveLength(2)
  })
})


describe('description search and operators', () => {
  const brew = allBlueprints.find(b => b.id === 4403)!
  it('finds Mind in crafted-output descriptions when absent from the name', () => {
    expect(brew.name.toLowerCase()).not.toContain('mind')
    expect(matchesBlueprintSearch(brew, 'mind', [brew.name])).toBe(true)
    const expected = allBlueprints.filter(b => b.itemCraftings?.some(r => r.craftingFinalProducts.some(p => p.finalProduct.metadata?.mechanics?.toLowerCase().includes('mind'))))
    expect(expected.length).toBeGreaterThan(1)
    expect(expected.every(b => matchesBlueprintSearch(b, 'mind', [b.name]))).toBe(true)
  })
  it('searches Blueprint descriptions but excludes Special Notes', () => {
    const blueprint = structuredClone(brew)
    blueprint.metadata!.mechanics = 'Unique description'
    blueprint.metadata!.notes = 'Special annotation'
    expect(matchesBlueprintSearch(blueprint, 'unique description', [])).toBe(true)
    expect(matchesBlueprintSearch(blueprint, 'special annotation', [])).toBe(false)
  })
  it('keeps plain text as a contiguous phrase', () => {
    expect(matchesBlueprintSearch(brew, 'mind brew', [])).toBe(false)
    expect(matchesBlueprintSearch(brew, 'invigorating brew', [])).toBe(true)
  })
  it('AND matches different fields, independently of order', () => {
    expect(matchesBlueprintSearch(brew, 'Mind+Brew', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'brew + MIND', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'mind+nonexistent', [])).toBe(false)
  })
  it('OR accepts either term', () => {
    expect(matchesBlueprintSearch(brew, 'missing|mind', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'brew|missing', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'missing|absent', [])).toBe(false)
  })
  it('minus excludes matching text from any field', () => {
    expect(matchesBlueprintSearch(brew, 'mind-brew', [])).toBe(false)
    expect(matchesBlueprintSearch(brew, 'mind-weapon', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'brew-townie', [])).toBe(false)
  })
  it('applies AND/NOT before OR and tolerates incomplete typing', () => {
    expect(matchesBlueprintSearch(brew, 'missing+weapon|mind-banana', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'mind+', [])).toBe(true)
    expect(matchesBlueprintSearch(brew, '|', [])).toBe(false)
    expect(matchesBlueprintSearch(brew, 'mind|', [])).toBe(true)
  })
  it('quoted phrases preserve literal operators and normalize whitespace', () => {
    expect(matchesBlueprintSearch(brew, '"box-trap"', ['Box-Trap'])).toBe(true)
    expect(matchesBlueprintSearch(brew, '"a+b|c"', ['A+B|C'])).toBe(true)
    expect(matchesBlueprintSearch(brew, 'regain   20 mind', [])).toBe(true)
  })
})


it('does not match assistant Mind boilerplate or use it to exclude real effects', () => {
  const blueprint = structuredClone(allBlueprints.find(b => b.id === 4403)!)
  blueprint.name = 'Example Tool'
  blueprint.metadata!.notes = 'A Skilled Artisan Assistant helping with the creation of this item regains 2 Mind.'
  for (const recipe of blueprint.itemCraftings!) for (const product of recipe.craftingFinalProducts) {
    product.finalProduct.name = 'Example Tool'
    product.finalProduct.metadata!.mechanics = 'Repairs a broken door.'
    product.finalProduct.metadata!.notes = 'Mind appears only in special notes.'
  }
  expect(matchesBlueprintSearch(blueprint, 'mind', [])).toBe(false)
  expect(matchesBlueprintSearch(blueprint, 'door-mind', [])).toBe(true)
  expect(matchesBlueprintSearch(blueprint, 'door', [])).toBe(true)
})
