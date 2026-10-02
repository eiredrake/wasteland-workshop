export type EconomicsSettings = {
  mindCostPerPoint: number
  timeCostPerMinute: number
  defaultMarkupPercent: number
  basicForagingCardCost: number
  proficientForagingCardCost: number
  masterForagingCardCost: number
}

export const defaultEconomicsSettings: EconomicsSettings = {
  mindCostPerPoint: 0.8,
  timeCostPerMinute: 0.1,
  defaultMarkupPercent: 25,
  basicForagingCardCost: 2,
  proficientForagingCardCost: 5,
  masterForagingCardCost: 9,
}