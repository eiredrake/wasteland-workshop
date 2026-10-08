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
