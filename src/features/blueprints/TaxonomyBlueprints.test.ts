import { describe, expect, it } from 'vitest'
import { allBlueprints, masterBlueprints } from './blueprints'
import { isProcedureBlueprint } from './ProcedureAction'
import { enqueueBlueprintBuild, calculateBuildCost, editBuild } from '../builds/BuildQueueService'
import { loadBuildQueue, saveBuildQueue } from '../builds/BuildQueueRepository'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'

const taxonomy = allBlueprints.filter(b => b.itemCraftings?.[0]?.craftingFinalProducts[0]?.finalProduct.kind === 'taxonomy')
describe('Taxonomy-output Blueprint eligibility', () => {
  it('includes all 16 previously excluded recipes, retaining other eligibility rules', () => {
    expect(taxonomy).toHaveLength(16)
    for (const blueprint of taxonomy) expect(masterBlueprints).toContain(blueprint)
    expect(masterBlueprints).toEqual(allBlueprints.filter(b => isProcedureBlueprint(b) || !!b.itemCraftings?.length))
  })
  it.each(taxonomy.map(b => [b.name, b] as const))('queues %s with unchanged recipe, costs, notes and persistence', (_, blueprint) => {
    const before = structuredClone(blueprint)
    const economics = resolveEconomicsSettings()
    const original = allBlueprints.find(b => b.name === 'Sosweet Smashstick')!
    const existing = enqueueBlueprintBuild([], original, economics, 1000, 'existing', false)
    let queue = enqueueBlueprintBuild(existing, blueprint, economics, 1000, 'taxonomy', false)
    expect(queue[0]).toBe(existing[0])
    const build = queue[1], recipe = blueprint.itemCraftings![0]
    expect(build.recipe).toEqual(recipe)
    expect(build.recipe).not.toBe(recipe)
    expect(build.timer.originalDurationMs).toBe(recipe.craftingTimeInMinute * 60000)
    expect(calculateBuildCost(build)).toEqual(calculateBlueprintCost(recipe, new DefaultCostCalculator(economics)))
    expect(calculateBuildCost(build).components.map(c => [c.itemId, c.quantity])).toEqual(recipe.craftingComponents.map(c => [c.component.id, c.amount]))
    queue = editBuild(queue, build.id, 'Chosen output recorded manually', {})
    const values = new Map<string, string>()
    const storage = {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }}
    saveBuildQueue(queue, storage)
    expect(loadBuildQueue(storage, 1000)).toEqual(queue)
    expect(queue[1].notes).toBe('Chosen output recorded manually')
    expect(blueprint).toEqual(before)
  })
})
