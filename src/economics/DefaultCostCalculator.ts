import type { CostCalculator, ProductionCostInput  } from './CostCalculator'

const MIND_COST_PER_POINT = 0.8
const TIME_COST_PER_MINUTE = 0.1

export class DefaultCostCalculator implements CostCalculator {
  calculateMindCost(mind: number): number {
    return mind * MIND_COST_PER_POINT
  }

  calculateTimeCost(minutes: number): number {
    return minutes * TIME_COST_PER_MINUTE
  }

  calculateProductionCost(input: ProductionCostInput): number {
    return (
      this.calculateMindCost(input.mind) +
      this.calculateTimeCost(input.minutes) +
      input.materialCost
    )
  }

  calculateSellingPrice(
    productionCost: number,
    markupPercent: number
  ): number {
    return Math.ceil(productionCost * (1 + markupPercent / 100))
  }
}