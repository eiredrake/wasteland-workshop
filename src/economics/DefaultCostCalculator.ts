import type { CostCalculator, ProductionCostInput } from './CostCalculator'
import { resolveEconomicsSettings, type EconomicsOverrides, type EconomicsSettings } from './EconomicsSettings'

export class DefaultCostCalculator implements CostCalculator {
  private readonly settings: EconomicsSettings

  constructor(overrides: EconomicsOverrides = {}, snapshot?: EconomicsSettings) {
    this.settings = snapshot ? structuredClone(snapshot) : resolveEconomicsSettings(overrides)
  }

  static fromSnapshot(snapshot: EconomicsSettings): DefaultCostCalculator {
    return new DefaultCostCalculator({}, snapshot)
  }

  calculateMindCost(mind: number): number { return mind * this.settings.mindCostPerPoint }
  calculateTimeCost(minutes: number): number { return minutes * this.settings.timeCostPerMinute }
  calculateResolveCost(resolve: number): number { return resolve * this.settings.resolveCostPerPoint }
  calculateProductionCost(input: ProductionCostInput): number {
    return this.calculateMindCost(input.mind) + this.calculateTimeCost(input.minutes)
      + this.calculateResolveCost(input.resolve) + input.materialCost
  }
  calculateForagingCardCost(): number { return this.settings.foragingCardCost }
  getEffectiveResourceValue(itemId: number): number | undefined { return this.settings.resourceValues[itemId] }
  calculateSellingPrice(productionCost: number, markupPercent: number): number {
    return Math.ceil(productionCost * (1 + markupPercent / 100))
  }
}
