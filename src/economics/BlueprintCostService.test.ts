import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateBlueprintCost } from './BlueprintCostService'
import { testBlueprints } from '../features/blueprints/testBlueprints'
import { testResourceEconomics } from './testResourceEconomics'

describe('calculateBlueprintCost', () => {
  const calculator = new DefaultCostCalculator()

  it('calculates Falsified Papers production cost as 34 credits', () => {
    const blueprint = testBlueprints.find(
      (blueprint) => blueprint.id === 5890
    )

    expect(blueprint).toBeDefined()

    const crafting = blueprint?.itemCraftings?.[0]

    expect(crafting).toBeDefined()

    if (!crafting) {
      throw new Error('Falsified Papers crafting data not found')
    }

    const cost = calculateBlueprintCost(
      crafting,
      testResourceEconomics,
      calculator
    )

    expect(cost.laborCost).toBe(6)
    expect(cost.materialCost).toBe(28)
    expect(cost.productionCost).toBe(34)
    expect(cost.hasUnknownComponentCosts).toBe(false)
  })
})