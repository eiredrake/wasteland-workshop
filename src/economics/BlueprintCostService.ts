import type { CostCalculator } from './CostCalculator'
import type { ResourceEconomics } from './ResourceEconomics'
import {
  calculateResourceValuations,
  findResourceEconomics,
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
  materialCost: number
  productionCost: number | undefined
  hasUnknownComponentCosts: boolean
}

export function calculateBlueprintCost(
  crafting: ItemCrafting,
  resources: ResourceEconomics[],
  calculator: CostCalculator
): BlueprintCost {
  const laborCost = calculator.calculateProductionCost({
    mind: crafting.craftingMindCost,
    minutes: crafting.craftingTimeInMinute,
    materialCost: 0,
    resolve: 0,
  })

  let materialCost = 0
  let hasUnknownComponentCosts = false
  const components: BlueprintComponentCost[] = []

  for (const craftingComponent of crafting.craftingComponents) {
    const resourceEconomics = findResourceEconomics(
      craftingComponent.component.id,
      resources
    )

    if (!resourceEconomics) {
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

    const valuations = calculateResourceValuations(
      resourceEconomics,
      calculator,
      resources
    )

    const unitCost = valuations[0]?.calculatedCost

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
        resolve: 0,
      })

  return {
    components,
    laborCost,
    materialCost,
    productionCost,
    hasUnknownComponentCosts,
  }
}