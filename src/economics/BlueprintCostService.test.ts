import { describe, expect, it } from 'vitest'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateBlueprintCost } from './BlueprintCostService'
import { testBlueprints } from '../features/blueprints/testBlueprints'

describe('calculateBlueprintCost', () => {
  const calculator = new DefaultCostCalculator()

  it('calculates Falsified Papers production cost as 20 credits', () => {
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
      calculator
    )

    expect(cost.laborCost).toBe(4)
    expect(cost.materialCost).toBe(16)
    expect(cost.productionCost).toBe(20)
    expect(cost.hasUnknownComponentCosts).toBe(false)
  })
})