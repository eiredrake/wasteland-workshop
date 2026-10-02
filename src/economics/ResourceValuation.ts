import type { AcquisitionMethod } from './AcquisitionMethod'
import type { CostCalculator } from './CostCalculator'

export type ResourceValuation = {
  itemId: number
  acquisitionMethod: AcquisitionMethod
  calculatedCost: number | undefined
}

export function calculateResourceValuation(
  itemId: number,
  acquisitionMethod: AcquisitionMethod,
  calculator: CostCalculator
): ResourceValuation {
  const foragingCardCost = acquisitionMethod.foragingTier
    ? calculator.calculateForagingCardCost(acquisitionMethod.foragingTier)
    : 0

  return {
    itemId,
    acquisitionMethod,
    calculatedCost: Math.ceil(
      calculator.calculateProductionCost(acquisitionMethod) +
        foragingCardCost
    ),
  }
}