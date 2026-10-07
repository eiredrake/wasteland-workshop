import type { CostCalculator } from './CostCalculator'
import {
  getEffectiveResourceValue,
} from './ResourceValuationService'
import type { ItemCrafting } from '../features/blueprints/ItemCrafting'


export type BlueprintComponentCost = {
  itemId: number
  name: string
  quantity: number
  unitCost: number | undefined
  totalCost: number | undefined
}

export type BlueprintCost = {
  components: BlueprintComponentCost[]
  laborCost: number
  resolveCost: number
  materialCost: number
  productionCost: number | undefined
  hasUnknownComponentCosts: boolean
}

export function calculateBlueprintCost(
  crafting: ItemCrafting,
  calculator: CostCalculator
): BlueprintCost {
  const laborCost = calculator.calculateProductionCost({
    mind: crafting.craftingMindCost,
    minutes: crafting.craftingTimeInMinute,
    materialCost: 0,
    resolve: 0,
  })

  const resolveCost = calculator.calculateResolveCost(crafting.craftingResolveCost ?? 0)
  let materialCost = 0
  let hasUnknownComponentCosts = false
  const components: BlueprintComponentCost[] = []

  for (const craftingComponent of crafting.craftingComponents) {
    const unitCost = getEffectiveResourceValue(craftingComponent.component.id, calculator)

    if (unitCost === undefined) {
      hasUnknownComponentCosts = true
    
      components.push({
        itemId: craftingComponent.component.id,
        name: craftingComponent.component.name,
        quantity: craftingComponent.amount,
        unitCost: undefined,
        totalCost: undefined,
      })
    
      continue
    }

    components.push({
      itemId: craftingComponent.component.id,
      name: craftingComponent.component.name,
      quantity: craftingComponent.amount,
      unitCost,
      totalCost: unitCost * craftingComponent.amount,
    })

    materialCost += unitCost * craftingComponent.amount
  }

  const productionCost = hasUnknownComponentCosts
    ? undefined
    : calculator.calculateProductionCost({
        mind: crafting.craftingMindCost,
        minutes: crafting.craftingTimeInMinute,
        materialCost,
        resolve: crafting.craftingResolveCost ?? 0,
      })

  return {
    components,
    laborCost,
    resolveCost,
    materialCost,
    productionCost,
    hasUnknownComponentCosts,
  }
}
