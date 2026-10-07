export type ProductionCostInput = {
  mind: number
  minutes: number
  materialCost: number
  resolve: number
}

export type ForagingTier = 'basic' | 'proficient' | 'master'

export interface CostCalculator {
  calculateMindCost(mind: number): number
  calculateTimeCost(minutes: number): number
  calculateProductionCost(input: ProductionCostInput): number
  calculateForagingCardCost(): number
  calculateResolveCost(resolve: number): number
  getEffectiveResourceValue(itemId: number): number | undefined
  calculateSellingPrice(
    productionCost: number,
    markupPercent: number
  ): number
}