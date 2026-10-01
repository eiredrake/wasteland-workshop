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
    const resourceMaterialCost =
      acquisitionMethod.resources?.reduce((total, requiredResource) => {
        const requiredResourceEconomics = findResourceEconomics(
          requiredResource.itemId,
          resources
        )

        if (!requiredResourceEconomics) {
          return total
        }

        const valuations = calculateResourceValuations(
          requiredResourceEconomics,
          calculator,
          resources,
          nextVisitedItemIds
        )

        const unitCost = valuations[0]?.calculatedCost ?? 0

        return total + unitCost * requiredResource.quantity
      }, 0) ?? 0

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