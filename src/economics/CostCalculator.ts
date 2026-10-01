export type ProductionCostInput = {
  mind: number
  minutes: number
  materialCost: number
  resolve: number
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