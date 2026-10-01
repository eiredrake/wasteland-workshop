import type { CostCalculator } from './CostCalculator'
import type { ResourceEconomics } from './ResourceEconomics'

import {
  calculateResourceValuation,
  type ResourceValuation,
} from './ResourceValuation'

export function calculateResourceValuations(
  resource: ResourceEconomics,
  calculator: CostCalculator,
  resources: ResourceEconomics[] = [],
  visitedItemIds: Set<number> = new Set()
): ResourceValuation[] {
  if (visitedItemIds.has(resource.itemId)) {
    return []
  }

  const nextVisitedItemIds = new Set(visitedItemIds)
  nextVisitedItemIds.add(resource.itemId)

  return resource.acquisitionMethods.map((acquisitionMethod) => {
    let resourceMaterialCost = 0
    let hasUnknownResourceCost = false

    for (const requiredResource of acquisitionMethod.resources ?? []) {
      const requiredResourceEconomics = findResourceEconomics(
        requiredResource.itemId,
        resources
      )

      if (!requiredResourceEconomics) {
        hasUnknownResourceCost = true
        continue
      }

      const valuations = calculateResourceValuations(
        requiredResourceEconomics,
        calculator,
        resources,
        nextVisitedItemIds
      )

      const unitCost = valuations[0]?.calculatedCost

      if (unitCost === undefined) {
        hasUnknownResourceCost = true
        continue
      }

      resourceMaterialCost += unitCost * requiredResource.quantity
    }

    if (hasUnknownResourceCost) {
      return {
        itemId: resource.itemId,
        acquisitionMethod,
        calculatedCost: undefined,
      }
    }

    return calculateResourceValuation(
      resource.itemId,
      {
        ...acquisitionMethod,
        materialCost:
          acquisitionMethod.materialCost + resourceMaterialCost,
      },
      calculator
    )
  })
}

export function findResourceEconomics(
  itemId: number,
  resources: ResourceEconomics[]
): ResourceEconomics | undefined {
  return resources.find((resource) => resource.itemId === itemId)
}