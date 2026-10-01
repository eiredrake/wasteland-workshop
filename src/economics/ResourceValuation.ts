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
  return {
    itemId,
    acquisitionMethod,
    calculatedCost: calculator.calculateProductionCost(acquisitionMethod),
  }
}