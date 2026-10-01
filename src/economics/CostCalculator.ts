export type ProductionCostInput = {
  mind: number
  minutes: number
  materialCost: number
  resolveCost: number
}

export interface CostCalculator {
  calculateMindCost(mind: number): number
  calculateTimeCost(minutes: number): number
  calculateProductionCost(input: ProductionCostInput): number
  calculateSellingPrice(
    productionCost: number,
    markupPercent: number
  ): number
}