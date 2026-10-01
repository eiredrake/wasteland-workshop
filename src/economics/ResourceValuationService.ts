import type { CostCalculator } from './CostCalculator'
import type { ResourceEconomics } from './ResourceEconomics'

import {
  calculateResourceValuation,
  type ResourceValuation,
} from './ResourceValuation'

export function calculateResourceValuations(
  resource: ResourceEconomics,
  calculator: CostCalculator
): ResourceValuation[] {
  return resource.acquisitionMethods.map((acquisitionMethod) =>
    calculateResourceValuation(
      resource.itemId,
      acquisitionMethod,
      calculator
    )
  )
}

export function findResourceEconomics(
  itemId: number,
  resources: ResourceEconomics[]
): ResourceEconomics | undefined {
  return resources.find((resource) => resource.itemId === itemId)
}