import type {
  CostCalculator,
  ForagingTier,
  ProductionCostInput,
} from './CostCalculator'
import {
  defaultEconomicsSettings,
  type EconomicsSettings,
} from './EconomicsSettings'

export class DefaultCostCalculator implements CostCalculator {
  private readonly settings: EconomicsSettings

  constructor(settings: EconomicsSettings = defaultEconomicsSettings) {
    this.settings = settings
  }

  calculateMindCost(mind: number): number {
    return mind * this.settings.mindCostPerPoint
  }

  calculateTimeCost(minutes: number): number {
    return minutes * this.settings.timeCostPerMinute
  }

  calculateProductionCost(input: ProductionCostInput): number {
    return (
      this.calculateMindCost(input.mind) +
      this.calculateTimeCost(input.minutes) +
      input.materialCost
    )
  }

  calculateForagingCardCost(tier: ForagingTier): number {
    switch (tier) {
      case 'basic':
        return this.settings.basicForagingCardCost
      case 'proficient':
        return this.settings.proficientForagingCardCost
      case 'master':
        return this.settings.masterForagingCardCost
    }
  }

  calculateSellingPrice(
    productionCost: number,
    markupPercent: number
  ): number {
    return Math.ceil(productionCost * (1 + markupPercent / 100))
  }
}